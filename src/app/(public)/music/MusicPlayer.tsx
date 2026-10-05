"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import { FOCUS_RING, IconButton } from "@/components/ui/Button";
import { showsPartNumber, slotLabel } from "@/lib/livecuts/title";
import type { LiveCutView } from "@/lib/livecuts/view";
import { ExternalLinkIcon } from "./LiveCutCard";
import LiveCutCover from "./LiveCutCover";

/**
 * The Music page's player — ONE SoundCloud iframe for the whole page, created
 * at the first tap on a play and reused with `load()` for every card after it
 * (MUS-06, UI-SPEC §B).
 *
 * ── Nothing of SoundCloud exists before the gesture ──────────────────────────
 *
 * Before the first tap there is no bar, no iframe and no third-party script in
 * the DOM, and no request leaves for SoundCloud: the visitor's IP and cookies
 * reach a third party only because they pressed play. `api.js` is injected by
 * `loadApi()`, which is called ONLY from `play()`, which is called ONLY from a
 * tap handler — never from an effect. The iframe is mounted after the script
 * answers, so a blocked script cannot leave a widget playing behind an error.
 *
 * ── The constants below are measurements, not preferences ────────────────────
 *
 * Every value is read from `52.3-SPIKE.md` `## Decisione` (plan 52.3-01,
 * measured on 2026-10-03 13:07–13:25 UTC on Chrome desktop, the Android
 * emulator and the iOS simulator). Changing one is a new measurement first.
 *
 * ── What "playing" means here (spike finding 1) ──────────────────────────────
 *
 * Playing = a `PLAY_PROGRESS` arrived. NOT a `PLAY`: after every `load()` the
 * widget emits a spurious `PLAY` of the previous track at +4 ms, and on iOS a
 * refused play is `PLAY` followed by `PAUSE` within ~500 ms. So the refusal
 * timer closes only on `PLAY_PROGRESS`, and a `PAUSE` the listener did not ask
 * for while that timer runs opens the fallback at once.
 *
 * ── Zero silent failures ─────────────────────────────────────────────────────
 *
 * There is no error tracking in this repository (`meta-gates.md`), so a log
 * line alone reaches nobody. Every failure has a visible sentence AND its own
 * log category, with the LiveCut id and never its title:
 * `music_player.api_unreachable`, `music_player.ready_timeout`,
 * `music_player.error_event` (errors, `role="alert"`) and
 * `music_player.play_refused` (a warning: the fallback, `role="status"`).
 *
 * The state lives in a React context with `useReducer`; the layout adapts with
 * `md:` in CSS only — the viewport is never read in JavaScript (UI-SPEC §0.4).
 */

/**
 * `hidden-with-fallback` (spike `iframe_mode`): Chrome desktop and Android play
 * with the iframe hidden (PLAY_PROGRESS at 1770 and 7363 ms from the tap); the
 * iOS simulator never plays a NEW track from a hidden iframe, and plays after
 * one tap inside the widget — which is the fallback state of UI-SPEC §B.3.
 */
export const IFRAME_MODE = "hidden-with-fallback" as const;

/**
 * 100 px (spike `fallback_height_px`): the lowest height at which every control
 * of the widget is whole on all three environments — play, title, waveform and,
 * on phones, the «Listen in browser» button under SoundCloud's own overlay. At
 * 80 that button touches the iframe's bottom edge; at 60 the play is covered;
 * 166 shows «Play another track» with other people's tracks after a pause.
 * Kept at 100 by plan 52.3-19 (2026-10-05): the minimum that shows «Listen in
 * browser» whole and away from the edge.
 */
export const FALLBACK_IFRAME_HEIGHT_PX = 100;

/**
 * 3000 ms (spike `play_refused_timeout_ms`), counted from `READY` (first track)
 * or from the `load()` callback (every track after) — NEVER from the tap: on
 * the Android emulator READY arrives 6077–6453 ms after the tap, so a timer
 * from the tap would fire on a widget that was about to play. From READY or the
 * callback to the first PLAY_PROGRESS the slowest measure was 1.8 s.
 */
export const PLAY_REFUSED_TIMEOUT_MS = 3000;

/**
 * 10000 ms (spike `ready_timeout_ms`): the slowest READY measured was 6453 ms
 * (Android emulator), under 1 s on desktop and on the iOS simulator. The same
 * bound applies to the `load()` callback of the tracks after the first.
 */
export const READY_TIMEOUT_MS = 10000;

const API_URL = "https://w.soundcloud.com/player/api.js";

/**
 * The widget's colour, written ALREADY ENCODED: it is the accent, because the
 * widget IS the playback control (UI-SPEC §Color, reservation 2). No literal
 * hash form of the value exists in this file (`verify:semantic-separation`).
 */
const WIDGET_COLOR_PARAM = "%23FF5C93";

/** The widget parameters, shared by the iframe `src` and every `load()`. */
const WIDGET_FLAGS = {
  auto_play: true,
  show_artwork: false,
  show_user: true,
  buying: false,
  sharing: false,
  download: false,
  show_playcount: false,
} as const;

/** Built from the numeric id only: no oEmbed `html` is ever injected (T-52.3-04). */
function trackApiUrl(trackId: string): string {
  return `https://api.soundcloud.com/tracks/${trackId}`;
}

function widgetSrc(trackId: string): string {
  return (
    "https://w.soundcloud.com/player/?url=" +
    encodeURIComponent(trackApiUrl(trackId)) +
    "&auto_play=true&color=%23FF5C93&show_artwork=false&show_user=true&buying=false&sharing=false&download=false&show_playcount=false"
  );
}

// ── The minimum of the Widget API this file uses, declared here ─────────────

interface ScProgress {
  /** The track the event speaks for — after a `load()` the previous one still speaks for a moment. */
  soundId?: number;
  relativePosition: number;
  currentPosition: number;
}

interface ScLoadOptions {
  auto_play?: boolean;
  color?: string;
  show_artwork?: boolean;
  show_user?: boolean;
  buying?: boolean;
  sharing?: boolean;
  download?: boolean;
  show_playcount?: boolean;
  callback?: () => void;
}

interface ScWidget {
  bind(eventName: string, listener: (payload?: ScProgress) => void): void;
  unbind(eventName: string): void;
  play(): void;
  pause(): void;
  load(url: string, options: ScLoadOptions): void;
}

interface ScEvents {
  READY: string;
  PLAY: string;
  PAUSE: string;
  FINISH: string;
  PLAY_PROGRESS: string;
  ERROR: string;
}

interface ScApi {
  Widget: ((iframe: HTMLIFrameElement) => ScWidget) & { Events: ScEvents };
}

declare global {
  interface Window {
    SC?: ScApi;
  }
}

// ── State ────────────────────────────────────────────────────────────────────

export type PlayerStatus =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "finished"
  | "refused"
  | "api_unreachable"
  | "ready_timeout"
  | "error_event";

interface PlayerState {
  current: LiveCutView | null;
  status: PlayerStatus;
  /** The one iframe: its key changes only when a widget that never became ready is replaced. */
  iframe: { key: number; src: string } | null;
  /**
   * The fallback, INSIDE the bar: `refused` is the only action that opens it,
   * and `play` / `progress` close it again — the moment the track really plays.
   * No longer «for the rest of the visit»: after the one tap iOS demands inside
   * the widget, pause and resume work from our bar with the iframe hidden again
   * (`52.3-SPIKE.md:161`), and the owner asked on 2026-10-05 for one player
   * only, ours (request 17, plan 52.3-19).
   */
  iframeVisible: boolean;
  positionMs: number;
  relative: number;
}

type PlayerAction =
  | { type: "tap"; liveCut: LiveCutView; resume: boolean; dropIframe: boolean }
  | { type: "mount_iframe"; key: number; src: string }
  | { type: "ready" }
  | { type: "play"; positionMs: number; relative: number }
  | { type: "progress"; positionMs: number; relative: number }
  | { type: "pause" }
  | { type: "finish" }
  | { type: "refused" }
  | { type: "api_unreachable" }
  | { type: "ready_timeout" }
  | { type: "error_event" };

const INITIAL_STATE: PlayerState = {
  current: null,
  status: "idle",
  iframe: null,
  iframeVisible: false,
  positionMs: 0,
  relative: 0,
};

function reducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case "tap":
      return {
        ...state,
        current: action.liveCut,
        status: "loading",
        iframe: action.dropIframe ? null : state.iframe,
        positionMs: action.resume ? state.positionMs : 0,
        relative: action.resume ? state.relative : 0,
      };
    case "mount_iframe":
      return { ...state, iframe: { key: action.key, src: action.src } };
    case "ready":
      return state;
    case "play":
    case "progress":
      return {
        ...state,
        status: "playing",
        iframeVisible: false,
        positionMs: action.positionMs,
        relative: action.relative,
      };
    case "pause":
      return { ...state, status: "paused" };
    case "finish":
      return {
        ...state,
        status: "finished",
        relative: 1,
        positionMs: state.current ? state.current.durationSeconds * 1000 : state.positionMs,
      };
    case "refused":
      return { ...state, status: "refused", iframeVisible: true };
    case "api_unreachable":
    case "ready_timeout":
    case "error_event":
      return { ...state, status: action.type };
  }
}

// ── Context ──────────────────────────────────────────────────────────────────

interface MusicPlayerContextValue {
  current: string | null;
  status: PlayerStatus;
  play: (liveCut: LiveCutView) => void;
  pause: () => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextValue | null>(null);

/** Throws outside the provider: a play button without a player is a wiring defect, not a state. */
export function useMusicPlayer(): MusicPlayerContextValue {
  const ctx = useContext(MusicPlayerContext);
  if (!ctx) throw new Error("useMusicPlayer must be used inside MusicPlayerProvider");
  return ctx;
}

type Timer = ReturnType<typeof setTimeout> | null;

/**
 * Renders the page's event blocks, then — only after the first tap — the bar.
 * The bar sits in the flow after the last block, so at the end of the page it
 * covers no card and needs no spacer (UI-SPEC §B.1).
 */
export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const widgetRef = useRef<ScWidget | null>(null);
  const widgetReadyRef = useRef(false);
  const apiPromiseRef = useRef<Promise<void> | null>(null);
  const iframeKeyRef = useRef(0);
  const tapGenRef = useRef(0);
  const readyTimerRef = useRef<Timer>(null);
  const refusedTimerRef = useRef<Timer>(null);
  /** Between a `load()` and its callback: the widget still speaks for the previous track. */
  const awaitingCallbackRef = useRef(false);
  /** An ERROR wins over the READY or the callback that follows it 1–2 ms later (spike). */
  const erroredRef = useRef(false);
  /** The listener asked for this pause — so the PAUSE that follows is not a refusal. */
  const userPauseRef = useRef(false);
  /**
   * Written synchronously by the handlers, never from the rendered state: the
   * widget's events arrive faster than React commits. Measured by CDP on
   * 2026-10-03: right after FINISH the widget sends one more PLAY_PROGRESS at
   * position 0, and a guard reading the rendered status (still `playing`)
   * turned the finished bar back into a playing one at 0 %.
   */
  const liveCutIdRef = useRef<string | null>(null);
  const trackIdRef = useRef<string | null>(null);
  const finishedRef = useRef(false);
  const progressingRef = useRef(false);
  /**
   * A PLAY of the requested track was seen since the last `play()`. Only a
   * PAUSE AFTER it is a refusal (iOS: PLAY, then PAUSE within ~500 ms). Chrome
   * sends a PAUSE 6 ms BEFORE the PLAY of every fresh track (CDP, 2026-10-03,
   * on both the first track and after `load()`): that one is the widget
   * resetting, not a refusal, and treating it as one opened the fallback on a
   * desktop that then played normally.
   */
  const sawPlayRef = useRef(false);

  const clearTimer = useCallback((ref: { current: Timer }) => {
    if (ref.current !== null) {
      clearTimeout(ref.current);
      ref.current = null;
    }
  }, []);

  const clearTimers = useCallback(() => {
    clearTimer(readyTimerRef);
    clearTimer(refusedTimerRef);
  }, [clearTimer]);

  useEffect(() => clearTimers, [clearTimers]);

  const refuse = useCallback(
    (id: string, reason: string) => {
      clearTimer(refusedTimerRef);
      console.warn(`[music_player.play_refused] livecut=${id}: ${reason}`);
      dispatch({ type: "refused" });
    },
    [clearTimer],
  );

  const startRefusedTimer = useCallback(
    (id: string) => {
      clearTimer(refusedTimerRef);
      refusedTimerRef.current = setTimeout(() => {
        refusedTimerRef.current = null;
        refuse(id, `no PLAY_PROGRESS within ${PLAY_REFUSED_TIMEOUT_MS} ms of the widget being ready`);
      }, PLAY_REFUSED_TIMEOUT_MS);
    },
    [clearTimer, refuse],
  );

  const startReadyTimer = useCallback(
    (id: string, what: string) => {
      clearTimer(readyTimerRef);
      readyTimerRef.current = setTimeout(() => {
        readyTimerRef.current = null;
        clearTimer(refusedTimerRef);
        console.error(`[music_player.ready_timeout] livecut=${id}: no ${what} within ${READY_TIMEOUT_MS} ms`);
        dispatch({ type: "ready_timeout" });
      }, READY_TIMEOUT_MS);
    },
    [clearTimer],
  );

  /** Injects `api.js` — called only from `play()`, i.e. inside a tap handler. */
  const loadApi = useCallback((): Promise<void> => {
    if (window.SC?.Widget) return Promise.resolve();
    if (apiPromiseRef.current) return apiPromiseRef.current;
    const promise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = API_URL;
      script.async = true;
      script.onload = () => {
        if (window.SC?.Widget) resolve();
        else reject(new Error("api.js loaded but SC.Widget is missing"));
      };
      script.onerror = () => {
        script.remove();
        reject(new Error("api.js could not be loaded"));
      };
      document.head.appendChild(script);
    });
    apiPromiseRef.current = promise;
    // A failed load may be retried by the next tap.
    promise.catch(() => {
      apiPromiseRef.current = null;
    });
    return promise;
  }, []);

  const play = useCallback(
    (liveCut: LiveCutView) => {
      const s = stateRef.current;
      const widget = widgetRef.current;
      userPauseRef.current = false;
      finishedRef.current = false;
      progressingRef.current = false;
      sawPlayRef.current = false;
      liveCutIdRef.current = liveCut.id;
      trackIdRef.current = liveCut.soundcloudTrackId;

      if (widget && widgetReadyRef.current) {
        if (s.current?.id === liveCut.id) {
          if (s.status === "playing" || s.status === "loading") return;
          if (s.status === "paused" || s.status === "finished" || s.status === "refused") {
            // Same track: resume from the page. The iOS simulator accepts this
            // once the listener has tapped inside the widget (spike, 13:24).
            dispatch({ type: "tap", liveCut, resume: true, dropIframe: false });
            erroredRef.current = false;
            widget.play();
            startRefusedTimer(liveCut.id);
            return;
          }
        }
        // Another track (or a retry after an error): the same iframe, `load()`.
        dispatch({ type: "tap", liveCut, resume: false, dropIframe: false });
        clearTimers();
        erroredRef.current = false;
        awaitingCallbackRef.current = true;
        startReadyTimer(liveCut.id, "load() callback");
        widget.load(trackApiUrl(liveCut.soundcloudTrackId), {
          ...WIDGET_FLAGS,
          color: decodeURIComponent(WIDGET_COLOR_PARAM),
          callback: () => {
            awaitingCallbackRef.current = false;
            clearTimer(readyTimerRef);
            if (erroredRef.current) return;
            // `auto_play` alone leaves the new track paused on Android (spike
            // finding 2): `play()` inside the callback.
            widget.play();
            startRefusedTimer(liveCut.id);
          },
        });
        return;
      }

      // No ready widget: the first tap, or a retry after a failure before READY.
      // A widget that never became ready is replaced, never kept beside a new one.
      const gen = ++tapGenRef.current;
      widgetRef.current = null;
      widgetReadyRef.current = false;
      erroredRef.current = false;
      awaitingCallbackRef.current = false;
      clearTimers();
      dispatch({ type: "tap", liveCut, resume: false, dropIframe: true });
      startReadyTimer(liveCut.id, "READY");
      loadApi().then(
        () => {
          if (tapGenRef.current !== gen) return;
          iframeKeyRef.current += 1;
          dispatch({
            type: "mount_iframe",
            key: iframeKeyRef.current,
            src: widgetSrc(liveCut.soundcloudTrackId),
          });
        },
        (error: unknown) => {
          if (tapGenRef.current !== gen) return;
          clearTimers();
          const message = error instanceof Error ? error.message : String(error);
          console.error(`[music_player.api_unreachable] livecut=${liveCut.id}: ${message}`);
          dispatch({ type: "api_unreachable" });
        },
      );
    },
    [clearTimer, clearTimers, loadApi, startReadyTimer, startRefusedTimer],
  );

  const pause = useCallback(() => {
    userPauseRef.current = true;
    progressingRef.current = false;
    clearTimer(refusedTimerRef);
    widgetRef.current?.pause();
    dispatch({ type: "pause" });
  }, [clearTimer]);

  // Binds the widget ONCE per iframe: `load()` keeps these listeners (spike
  // `load_keeps_listeners: yes`). This effect never loads `api.js`: it runs
  // only after `play()` has, because the iframe exists only then.
  const iframeKey = state.iframe?.key ?? null;
  useEffect(() => {
    const iframe = iframeRef.current;
    const sc = window.SC;
    if (iframeKey === null || !iframe || !sc) return;

    const widget = sc.Widget(iframe);
    const E = sc.Widget.Events;
    widgetRef.current = widget;
    const currentId = () => liveCutIdRef.current ?? "unknown";
    /** Events without a `soundId` are accepted; events of another track are not. */
    const isRequested = (payload?: ScProgress) =>
      payload?.soundId === undefined || String(payload.soundId) === trackIdRef.current;

    widget.bind(E.READY, () => {
      widgetReadyRef.current = true;
      clearTimer(readyTimerRef);
      dispatch({ type: "ready" });
      if (erroredRef.current) return;
      if (userPauseRef.current) {
        widget.pause();
        return;
      }
      widget.play();
      startRefusedTimer(currentId());
    });

    // Deliberately NOT "playing" (spike finding 1): spurious after `load()`,
    // and on iOS the first half of a refusal. PLAY_PROGRESS decides.
    // It only records that the requested track was asked to play, so that a
    // PAUSE right after it can be read as a refusal.
    widget.bind(E.PLAY, (payload) => {
      if (awaitingCallbackRef.current || !isRequested(payload)) return;
      sawPlayRef.current = true;
    });

    widget.bind(E.PLAY_PROGRESS, (payload) => {
      if (awaitingCallbackRef.current || erroredRef.current || userPauseRef.current) return;
      if (finishedRef.current || !isRequested(payload)) return;
      clearTimer(refusedTimerRef);
      const positionMs = payload?.currentPosition ?? 0;
      const relative = payload?.relativePosition ?? 0;
      dispatch({ type: progressingRef.current ? "progress" : "play", positionMs, relative });
      progressingRef.current = true;
    });

    widget.bind(E.PAUSE, (payload) => {
      if (awaitingCallbackRef.current || erroredRef.current) return;
      if (finishedRef.current || !isRequested(payload)) return;
      progressingRef.current = false;
      if (userPauseRef.current) {
        dispatch({ type: "pause" });
        return;
      }
      if (refusedTimerRef.current !== null) {
        // Inside the refusal window: before the PLAY it is the widget
        // resetting (Chrome); after it, it is the refusal (iOS).
        if (sawPlayRef.current) {
          refuse(currentId(), "PAUSE right after PLAY, not asked by the listener");
        }
        return;
      }
      // Paused from inside the visible widget.
      dispatch({ type: "pause" });
    });

    // The end of a LiveCut is the end: no `load()`, no `play()` — no autoplay.
    widget.bind(E.FINISH, () => {
      finishedRef.current = true;
      progressingRef.current = false;
      clearTimers();
      dispatch({ type: "finish" });
    });

    widget.bind(E.ERROR, () => {
      erroredRef.current = true;
      clearTimers();
      console.error(`[music_player.error_event] livecut=${currentId()}: the widget reported ERROR`);
      dispatch({ type: "error_event" });
    });

    return () => {
      for (const name of [E.READY, E.PLAY, E.PLAY_PROGRESS, E.PAUSE, E.FINISH, E.ERROR]) {
        widget.unbind(name);
      }
      if (widgetRef.current === widget) widgetRef.current = null;
    };
  }, [iframeKey, clearTimer, clearTimers, refuse, startRefusedTimer]);

  const value = useMemo<MusicPlayerContextValue>(
    () => ({ current: state.current?.id ?? null, status: state.status, play, pause }),
    [state.current, state.status, play, pause],
  );

  return (
    <MusicPlayerContext.Provider value={value}>
      {children}
      {state.current && (
        <PlayerBar state={state} iframeRef={iframeRef} play={play} pause={pause} />
      )}
    </MusicPlayerContext.Provider>
  );
}

// ── Icons (Heroicons v2 outline, pasted as the rest of the tree does) ───────

export function PlayerIcon({
  name,
  className = "h-5 w-5",
}: {
  name: "play" | "pause" | "arrow-path";
  className?: string;
}) {
  const d =
    name === "play"
      ? "M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
      : name === "pause"
        ? "M15.75 5.25v13.5m-7.5-13.5v13.5"
        : "M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99";
  const spin = name === "arrow-path" ? " animate-spin motion-reduce:animate-none" : "";
  return (
    <svg
      className={`${className} shrink-0${spin}`}
      aria-hidden="true"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

// ── The bar ─────────────────────────────────────────────────────────────────

const ERROR_SENTENCES: Partial<Record<PlayerStatus, string>> = {
  api_unreachable:
    "The SoundCloud player couldn't be reached. Open the LiveCut on SoundCloud instead.",
  ready_timeout:
    "The SoundCloud player didn't load in time. Open the LiveCut on SoundCloud instead.",
  error_event: "SoundCloud can't play this LiveCut here. Open it on SoundCloud instead.",
};

function minutes(seconds: number): number {
  return Math.floor(seconds / 60);
}

function PlayerBar({
  state,
  iframeRef,
  play,
  pause,
}: {
  state: PlayerState;
  iframeRef: { current: HTMLIFrameElement | null };
  play: (liveCut: LiveCutView) => void;
  pause: () => void;
}) {
  const liveCut = state.current;
  if (!liveCut) return null;

  const durationS = liveCut.durationSeconds;
  const positionS = Math.min(durationS, Math.max(0, Math.round(state.positionMs / 1000)));
  const widthPct = `${Math.min(100, Math.max(0, state.relative * 100))}%`;
  const loading = state.status === "loading";
  const playing = state.status === "playing";
  const errorSentence = ERROR_SENTENCES[state.status];
  const visible = state.iframeVisible;

  return (
    // `relative` from §B.1 is not written: `sticky` already positions the bar
    // and contains the absolute progress line, and two position utilities on
    // one element would leave the winner to stylesheet order.
    <section
      aria-label="Player"
      className="sticky bottom-[calc(var(--nav-inset-block-end)+0.5rem)] z-40 mt-12 overflow-hidden rounded-2xl border border-line bg-surface"
    >
      <div
        role="progressbar"
        aria-label="Playback position"
        aria-valuemin={0}
        aria-valuemax={durationS}
        aria-valuenow={positionS}
        aria-valuetext={`${minutes(positionS)} min of ${minutes(durationS)} min`}
        className="absolute inset-x-0 top-0 h-1 bg-raised"
      >
        <div className="h-full bg-accent" style={{ width: widthPct }} />
      </div>

      {/* The one iframe. Its container switches class between hidden and
          visible; the iframe itself is never unmounted between the two, so the
          widget and its listeners survive (§B.2). */}
      <div className={visible ? "block px-2 pt-3" : "sr-only"}>
        {state.iframe && (
          <iframe
            key={state.iframe.key}
            ref={iframeRef}
            src={state.iframe.src}
            title="SoundCloud player"
            allow="autoplay; encrypted-media"
            height={FALLBACK_IFRAME_HEIGHT_PX}
            className={visible ? "w-full rounded-xl" : undefined}
            aria-hidden={visible ? undefined : true}
            tabIndex={visible ? undefined : -1}
          />
        )}
      </div>

      {state.status === "refused" && (
        <p role="status" className="px-2 pt-2 text-xs text-muted">
          Tap “Listen in browser” in the player.
        </p>
      )}

      <div className="flex items-center gap-2 p-2">
        <LiveCutCover
          id={liveCut.id}
          coverUrl={liveCut.coverUrl}
          className="h-14 w-14 shrink-0 rounded-xl object-cover"
        />
        <div className="min-w-0 flex-1 ms-2">
          <p className="truncate text-sm font-semibold text-ink normal-case">{liveCut.title}</p>
          <p className="truncate font-mono text-xs font-semibold text-muted">
            {/* PT only when the night has two or more parts — the card's rule
                (`showsPartNumber`, plan 52.3-17); otherwise the slot alone. */}
            {showsPartNumber(liveCut) && (
              <>
                <span aria-hidden="true">PT{liveCut.partNumber}</span>
                <span className="sr-only">Part {liveCut.partNumber}</span>
                {" · "}
              </>
            )}
            {slotLabel(liveCut.slotStart, liveCut.slotEnd)}
          </p>
        </div>
        <IconButton
          variant="primary"
          className="min-h-11 min-w-11"
          aria-label={loading ? "Loading" : playing ? "Pause" : "Play"}
          aria-busy={loading ? true : undefined}
          onClick={() => {
            if (playing) pause();
            else if (!loading) play(liveCut);
          }}
        >
          <PlayerIcon name={loading ? "arrow-path" : playing ? "pause" : "play"} />
        </IconButton>
        <a
          href={liveCut.soundcloudUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-full px-0 text-xs font-semibold text-ink-2 hover:text-ink md:px-4 ${FOCUS_RING}`}
        >
          <ExternalLinkIcon className="h-5 w-5 shrink-0" />
          <span className="sr-only md:not-sr-only">Open on SoundCloud</span>
        </a>
      </div>

      {errorSentence && (
        <p role="alert" className="px-2 pb-2 text-xs text-sem-crit">
          {errorSentence}
        </p>
      )}
    </section>
  );
}

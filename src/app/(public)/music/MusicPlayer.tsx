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
import { MUSIC_SOUNDCLOUD_PROFILE_URL } from "@/lib/livecuts/profile";
import { showsPartNumber, slotLabel } from "@/lib/livecuts/title";
import type { LiveCutView } from "@/lib/livecuts/view";
import { ExternalLinkIcon } from "./LiveCutCard";
import LiveCutCover from "./LiveCutCover";
import Waveform, { SEEK_STEP_S } from "./Waveform";

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

/**
 * 200 ms (spike «skip() sul profilo», 2026-10-06): a refusal on iOS is a PAUSE
 * that follows the PLAY by 340–520 ms (measured +134→+522 today, 1036→1501,
 * 262→777, 185→527 on 2026-10-03); the PAUSE the widget emits while it
 * re-seats after `skip(i)+play()` arrives in the SAME millisecond as the PLAY.
 * A PAUSE closer than this to the PLAY is the widget, not the listener's iOS.
 */
export const REFUSAL_MIN_GAP_MS = 200;

const API_URL = "https://w.soundcloud.com/player/api.js";

/**
 * ── One widget, the PROFILE, loaded once (plan 52.3-23) ──────────────────────
 *
 * The iframe is created on the first tap with the collective's profile URL: a
 * MULTI-SOUND widget, whose `getSounds()` lists every public track and whose
 * `skip(i)` switches track WITHOUT reloading the iframe. Measured on
 * 2026-10-06 (`52.3-SPIKE.md`): on the iOS simulator, after the one tap inside
 * the widget that the first play demands, `skip(1)` with the iframe hidden
 * played the next track in 2040 ms with no further tap; on Chrome in 755 ms.
 * `load()` — which reloads the document and brings the iOS refusal back on
 * every track — is now only the fallback for a LiveCut that is not on the
 * profile (the laboratory's fixtures, a track hosted elsewhere).
 */
const PROFILE_URL = MUSIC_SOUNDCLOUD_PROFILE_URL;

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

/**
 * The first iframe: the profile when there is one (no autoplay — the READY
 * handler skips to the requested track and plays), else the single track with
 * autoplay, as before plan 52.3-23.
 */
function widgetSrc(trackId: string): string {
  const url = PROFILE_URL ?? trackApiUrl(trackId);
  const autoPlay = PROFILE_URL ? "false" : "true";
  return (
    "https://w.soundcloud.com/player/?url=" +
    encodeURIComponent(url) +
    `&auto_play=${autoPlay}&color=%23FF5C93&show_artwork=false&show_user=true&buying=false&sharing=false&download=false&show_playcount=false`
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

interface ScSound {
  id?: number;
}

interface ScWidget {
  bind(eventName: string, listener: (payload?: ScProgress) => void): void;
  unbind(eventName: string): void;
  play(): void;
  pause(): void;
  /** Multi-sound widgets only (a set or a profile): switches track in place, no reload. */
  skip(soundIndex: number): void;
  /** The sounds of a multi-sound widget, in the widget's order; only `id` is read. */
  getSounds(callback: (sounds: ScSound[]) => void): void;
  /** Milliseconds. Documented by the Widget API; one postMessage per call. */
  seekTo(milliseconds: number): void;
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
  | { type: "seek"; positionMs: number }
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
    case "seek": {
      // Optimistic: the bar moves at once; the next PLAY_PROGRESS confirms it.
      const durationMs = state.current ? state.current.durationSeconds * 1000 : 0;
      const positionMs = Math.min(durationMs, Math.max(0, action.positionMs));
      return {
        ...state,
        positionMs,
        relative: durationMs > 0 ? positionMs / durationMs : 0,
        status: state.status === "finished" ? "paused" : state.status,
      };
    }
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
  /** ⏮ / ⏭ over `order` — the list as the visitor sees it (plan 52.3-23). */
  previous: () => void;
  next: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  /** Seconds, clamped to the current LiveCut. */
  seek: (seconds: number) => void;
}

/**
 * The position lives in its OWN context: PLAY_PROGRESS arrives several times
 * a second, and only the two waveforms (bar, current row) need to re-render
 * for it — not every play button of the list.
 */
interface MusicPositionValue {
  positionMs: number;
  relative: number;
}

const MusicPlayerContext = createContext<MusicPlayerContextValue | null>(null);
const MusicPositionContext = createContext<MusicPositionValue>({ positionMs: 0, relative: 0 });

/** Throws outside the provider: a play button without a player is a wiring defect, not a state. */
export function useMusicPlayer(): MusicPlayerContextValue {
  const ctx = useContext(MusicPlayerContext);
  if (!ctx) throw new Error("useMusicPlayer must be used inside MusicPlayerProvider");
  return ctx;
}

export function useMusicPosition(): MusicPositionValue {
  return useContext(MusicPositionContext);
}

/** True when a global shortcut must NOT steal the key (a field, a select, an editable). */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable ||
    target.getAttribute("role") === "slider"
  );
}

type Timer = ReturnType<typeof setTimeout> | null;

/**
 * Renders the page's event blocks, then — only after the first tap — the bar.
 * The bar sits in the flow after the last block, so at the end of the page it
 * covers no card and needs no spacer (UI-SPEC §B.1).
 *
 * `order` is what ⏮ / ⏭ step through: the page's list, filters applied, in
 * reading order (plan 52.3-23). The provider never derives it from the DOM.
 */
export function MusicPlayerProvider({
  children,
  order,
}: {
  children: ReactNode;
  order: LiveCutView[];
}) {
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
  /** `performance.now()` of that PLAY — a PAUSE closer than REFUSAL_MIN_GAP_MS is not a refusal. */
  const sawPlayAtRef = useRef(0);
  /**
   * The profile's sounds, `soundcloudTrackId` → index for `skip(i)`, filled
   * from `getSounds()` at READY (and again after a `load(<profile>)`).
   * Empty while the widget shows a single track (fallback mode).
   */
  const soundIndexRef = useRef<Map<string, number>>(new Map());
  /** What the iframe currently holds. `single` after a `load(<track>)` fallback. */
  const widgetModeRef = useRef<"profile" | "single">("single");

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
        // Another track (or a retry after an error).
        dispatch({ type: "tap", liveCut, resume: false, dropIframe: false });
        clearTimers();
        erroredRef.current = false;

        const index = soundIndexRef.current.get(liveCut.soundcloudTrackId);
        if (widgetModeRef.current === "profile" && index !== undefined) {
          // On the profile: `skip(i)` + `play()`, synchronously inside the tap,
          // no reload — the iOS refusal does not come back (spike 2026-10-06).
          // `play()` after `skip()` because `auto_play` alone left a track
          // paused on Android with `load()` (finding 2) and it does not hurt
          // on Chrome or iOS (measured). The refusal timer counts from here:
          // there is no callback; PLAY_PROGRESS came at 755 / 2040 ms.
          widget.skip(index);
          widget.play();
          startRefusedTimer(liveCut.id);
          return;
        }

        if (PROFILE_URL && widgetModeRef.current === "single" && index !== undefined) {
          // Back to a profile track from a single-track fallback: reload the
          // PROFILE once, then skip inside its callback.
          awaitingCallbackRef.current = true;
          startReadyTimer(liveCut.id, "load(profile) callback");
          widget.load(PROFILE_URL, {
            ...WIDGET_FLAGS,
            auto_play: false,
            color: decodeURIComponent(WIDGET_COLOR_PARAM),
            callback: () => {
              awaitingCallbackRef.current = false;
              clearTimer(readyTimerRef);
              widgetModeRef.current = "profile";
              if (erroredRef.current) return;
              widget.skip(index);
              widget.play();
              startRefusedTimer(liveCut.id);
            },
          });
          return;
        }

        // Not on the profile: the single-track `load()`, as before 52.3-23.
        awaitingCallbackRef.current = true;
        widgetModeRef.current = "single";
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

  /**
   * One `seekTo` per gesture (the waveform commits on `pointerup`, the keys
   * once per press). Before the widget is ready there is nothing to seek in;
   * the gesture is dropped, not queued — a queued seek on a track that then
   * refuses to play would be a surprise later.
   */
  const seek = useCallback((seconds: number) => {
    const current = stateRef.current.current;
    const widget = widgetRef.current;
    if (!current || !widget || !widgetReadyRef.current) return;
    const ms = Math.round(Math.min(current.durationSeconds, Math.max(0, seconds)) * 1000);
    widget.seekTo(ms);
    dispatch({ type: "seek", positionMs: ms });
  }, []);

  const orderRef = useRef(order);
  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  const currentIndex = state.current ? order.findIndex((lc) => lc.id === state.current?.id) : -1;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < order.length - 1;

  const step = useCallback(
    (delta: -1 | 1) => {
      const id = stateRef.current.current?.id;
      if (!id) return;
      const list = orderRef.current;
      const i = list.findIndex((lc) => lc.id === id);
      const target = i >= 0 ? list[i + delta] : undefined;
      if (target) play(target);
    },
    [play],
  );
  const previous = useCallback(() => step(-1), [step]);
  const next = useCallback(() => step(1), [step]);

  // Keyboard, only while the bar exists (a LiveCut was chosen): Space
  // play/pause, Shift+←/→ previous/next (SoundCloud's own grammar), ←/→ ±5 s.
  // Never inside a field, and never on the waveform slider, which handles its
  // own keys and stops them (plan 52.3-23, research §2).
  const hasBar = state.current !== null;
  useEffect(() => {
    if (!hasBar) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      const s = stateRef.current;
      switch (e.key) {
        case " ":
          e.preventDefault();
          if (s.status === "playing") pause();
          else if (s.current && s.status !== "loading") play(s.current);
          return;
        case "ArrowLeft":
          e.preventDefault();
          if (e.shiftKey) previous();
          else seek(s.positionMs / 1000 - SEEK_STEP_S);
          return;
        case "ArrowRight":
          e.preventDefault();
          if (e.shiftKey) next();
          else seek(s.positionMs / 1000 + SEEK_STEP_S);
          return;
        default:
          return;
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [hasBar, pause, play, previous, next, seek]);

  // Media Session: registered best-effort and NOT promised. While the audio
  // plays inside the cross-origin SoundCloud iframe the user agent routes the
  // hardware keys to that frame (W3C Media Session, Chromium `GetRoutedFrame`);
  // the handlers below answer only when the page itself holds the session.
  useEffect(() => {
    if (!hasBar || typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    try {
      ms.setActionHandler("previoustrack", () => previous());
      ms.setActionHandler("nexttrack", () => next());
      ms.setActionHandler("play", () => {
        const s = stateRef.current;
        if (s.current && s.status !== "loading") play(s.current);
      });
      ms.setActionHandler("pause", () => pause());
    } catch {
      // An action the user agent does not support throws: nothing to do.
    }
    return () => {
      try {
        for (const a of ["previoustrack", "nexttrack", "play", "pause"] as const) {
          ms.setActionHandler(a, null);
        }
      } catch {
        // Same.
      }
    };
  }, [hasBar, previous, next, play, pause]);

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
      if (!PROFILE_URL) {
        // Single-track widget with autoplay, as before plan 52.3-23.
        widgetModeRef.current = "single";
        widget.play();
        startRefusedTimer(currentId());
        return;
      }
      // The profile: read its sounds once, then skip to the requested track.
      widget.getSounds((sounds) => {
        const map = new Map<string, number>();
        sounds.forEach((s, i) => {
          if (typeof s?.id === "number") map.set(String(s.id), i);
        });
        soundIndexRef.current = map;
        widgetModeRef.current = "profile";
        if (erroredRef.current || userPauseRef.current) return;
        const requested = trackIdRef.current;
        const index = requested ? map.get(requested) : undefined;
        if (index === undefined) {
          // The first LiveCut is not on the profile: fall back to its own track.
          const id = currentId();
          if (!requested) return;
          awaitingCallbackRef.current = true;
          widgetModeRef.current = "single";
          startReadyTimer(id, "load() callback");
          widget.load(trackApiUrl(requested), {
            ...WIDGET_FLAGS,
            color: decodeURIComponent(WIDGET_COLOR_PARAM),
            callback: () => {
              awaitingCallbackRef.current = false;
              clearTimer(readyTimerRef);
              if (erroredRef.current) return;
              widget.play();
              startRefusedTimer(id);
            },
          });
          return;
        }
        if (index > 0) widget.skip(index);
        widget.play();
        startRefusedTimer(currentId());
      });
    });

    // Deliberately NOT "playing" (spike finding 1): spurious after `load()`,
    // and on iOS the first half of a refusal. PLAY_PROGRESS decides.
    // It only records that the requested track was asked to play, so that a
    // PAUSE right after it can be read as a refusal.
    widget.bind(E.PLAY, (payload) => {
      if (awaitingCallbackRef.current || !isRequested(payload)) return;
      sawPlayRef.current = true;
      sawPlayAtRef.current = performance.now();
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
        // resetting (Chrome); in the same instant as the PLAY it is the widget
        // re-seating after `skip()` (spike 2026-10-06); 340–520 ms after it,
        // it is the refusal (iOS).
        if (sawPlayRef.current && performance.now() - sawPlayAtRef.current >= REFUSAL_MIN_GAP_MS) {
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
  }, [iframeKey, clearTimer, clearTimers, refuse, startRefusedTimer, startReadyTimer]);

  const value = useMemo<MusicPlayerContextValue>(
    () => ({
      current: state.current?.id ?? null,
      status: state.status,
      play,
      pause,
      previous,
      next,
      hasPrevious,
      hasNext,
      seek,
    }),
    [state.current, state.status, play, pause, previous, next, hasPrevious, hasNext, seek],
  );
  const position = useMemo<MusicPositionValue>(
    () => ({ positionMs: state.positionMs, relative: state.relative }),
    [state.positionMs, state.relative],
  );

  return (
    <MusicPlayerContext.Provider value={value}>
      <MusicPositionContext.Provider value={position}>
        {children}
        {state.current && (
          <PlayerBar
            state={state}
            iframeRef={iframeRef}
            play={play}
            pause={pause}
            previous={previous}
            next={next}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            seek={seek}
          />
        )}
      </MusicPositionContext.Provider>
    </MusicPlayerContext.Provider>
  );
}

// ── Icons (Heroicons v2 outline, pasted as the rest of the tree does) ───────

export function PlayerIcon({
  name,
  className = "h-5 w-5",
}: {
  name: "play" | "pause" | "arrow-path" | "previous" | "next";
  className?: string;
}) {
  const d =
    name === "play"
      ? "M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
      : name === "pause"
        ? "M15.75 5.25v13.5m-7.5-13.5v13.5"
        : name === "previous"
          ? // Heroicons v2 outline `backward`.
            "M21 16.811c0 .864-.933 1.406-1.683.977l-7.108-4.061a1.125 1.125 0 0 1 0-1.954l7.108-4.061A1.125 1.125 0 0 1 21 8.689v8.122ZM11.25 16.811c0 .864-.933 1.406-1.683.977l-7.108-4.061a1.125 1.125 0 0 1 0-1.954l7.108-4.061a1.125 1.125 0 0 1 1.683.977v8.122Z"
          : name === "next"
            ? // Heroicons v2 outline `forward`.
              "M3 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 0 1 0 1.954l-7.108 4.061A1.125 1.125 0 0 1 3 16.811V8.69ZM12.75 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 0 1 0 1.954l-7.108 4.061a1.125 1.125 0 0 1-1.683-.977V8.69Z"
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

/**
 * The bar (UI-SPEC §B, re-laid out by plans 52.3-22/23 after the research of
 * 2026-10-06, `52.3-PLAYER-RESEARCH.md`):
 *
 *   cover 56 · title / slot  ·  ⏮ play ⏭  ·  waveform  ·  SoundCloud
 *
 * The controls sit in the middle, as on every bar that has ⏮/⏭ (Mutant,
 * Deezer, YouTube Music); the waveform, when the LiveCut has peaks, takes the
 * width between them and the link on a desktop and its own full row on a
 * phone (one instance, flex order — never two canvases). Without peaks the
 * thin progress line on the top edge stays, as before: no fake wave.
 * Measured heights elsewhere: 42–65 px without a wave, 84–106 with one; ours
 * is ~72 on a desktop and ~130 on a phone with the wave row.
 */
function PlayerBar({
  state,
  iframeRef,
  play,
  pause,
  previous,
  next,
  hasPrevious,
  hasNext,
  seek,
}: {
  state: PlayerState;
  iframeRef: { current: HTMLIFrameElement | null };
  play: (liveCut: LiveCutView) => void;
  pause: () => void;
  previous: () => void;
  next: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  seek: (seconds: number) => void;
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
  const peaks = liveCut.peaks;

  return (
    // `relative` from §B.1 is not written: `sticky` already positions the bar
    // and contains the absolute progress line, and two position utilities on
    // one element would leave the winner to stylesheet order.
    <section
      aria-label="Player"
      className="sticky bottom-[calc(var(--nav-inset-block-end)+0.5rem)] z-40 mt-12 overflow-hidden rounded-2xl border border-line bg-surface"
    >
      {!peaks && (
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
      )}

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

      {/* Bound to the visible fallback, not to `status === "refused"`: on iOS
          the widget sends PAUSE after the refusal (spike: PLAY then PAUSE), the
          status turns `paused` while the widget stays visible, and the sentence
          vanished with it (simulator, L3 run of 52.3-20, 2026-10-05). */}
      {visible && (
        <p role="status" className="px-2 pt-2 text-xs text-muted">
          Tap “Listen in browser” in the player.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-1 gap-y-1 p-2">
        <LiveCutCover
          id={liveCut.id}
          coverUrl={liveCut.coverUrl}
          className="h-14 w-14 shrink-0 rounded-xl object-cover"
        />
        <div className="min-w-0 flex-1 ms-2 md:flex-none md:w-52">
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
            {/* The elapsed time from `md:` only: at 375 px it truncated the slot
                (simulator, 2026-10-06); the waveform's `aria-valuetext` says it. */}
            <span className="hidden md:inline">
              <span aria-hidden="true"> · </span>
              <span className="tabular-nums">{minutes(positionS)}:{String(positionS % 60).padStart(2, "0")}</span>
            </span>
          </p>
        </div>
        <div className="flex items-center gap-0.5 md:mx-2" role="group" aria-label="Playback">
          <IconButton
            variant="ghost"
            className="min-h-11 min-w-11"
            aria-label="Previous LiveCut"
            disabled={!hasPrevious}
            onClick={previous}
          >
            <PlayerIcon name="previous" />
          </IconButton>
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
          <IconButton
            variant="ghost"
            className="min-h-11 min-w-11"
            aria-label="Next LiveCut"
            disabled={!hasNext}
            onClick={next}
          >
            <PlayerIcon name="next" />
          </IconButton>
        </div>
        {peaks && (
          <Waveform
            peaks={peaks}
            durationSeconds={durationS}
            positionSeconds={state.positionMs / 1000}
            onSeek={seek}
            className="order-last basis-full md:order-none md:min-w-40 md:basis-0 md:flex-1"
          />
        )}
        <a
          href={liveCut.soundcloudUrl}
          target="_blank"
          rel="noopener noreferrer"
          // Icon only, on every width: the card's row already carries the text
          // link, and the width goes to the waveform (every bar measured on
          // 2026-10-06 puts the service mark alone at the right).
          // Hidden on a phone: at 375 px the three controls left the title
          // 80 px (measured 2026-10-06), and the card's row has the same link.
          className={`hidden min-h-11 min-w-11 items-center justify-center rounded-full text-ink-2 hover:text-ink md:inline-flex ${FOCUS_RING}`}
        >
          <ExternalLinkIcon className="h-5 w-5 shrink-0" />
          <span className="sr-only">Open on SoundCloud</span>
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

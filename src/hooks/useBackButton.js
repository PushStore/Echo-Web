import { useState, useEffect, useRef, useCallback } from "react";

// ── Back-button modal/page navigation stack ──────────────────────────────────
// Manages Android hardware back button behavior:
//   1. Close any open sheet/modal (via pushModal/popModal)
//   2. Close compose
//   3. Close exit dialog
//   4. Navigate back through page history (navStack)
//   5. Show exit prompt if at home root
//   6. Otherwise go home
//
// Also provides switchTab and handleUserClick helpers.
export function useBackButton({ tab, setTab, viewingProfile, setViewingProfile, composing, setComposing, exitPrompt, setExitPrompt }) {
  const modalStack = useRef([]); // array of close-functions
  const navStack = useRef([]);   // page history

  const pushModal = useCallback((closeFn) => {
    modalStack.current.push(closeFn);
  }, []);

  const popModal = useCallback(() => {
    if (modalStack.current.length > 0) {
      const close = modalStack.current.pop();
      close();
      return true;
    }
    return false;
  }, []);

  const switchTab = useCallback((t) => {
    if (t !== tab || viewingProfile) {
      navStack.current.push({ tab, viewingProfile });
    }
    modalStack.current = [];
    setTab(t);
    setViewingProfile(null);
  }, [tab, viewingProfile, setTab, setViewingProfile]);

  const handleUserClick = useCallback((user) => {
    navStack.current.push({ tab, viewingProfile });
    modalStack.current = [];
    setViewingProfile(user);
    setTab("profile");
  }, [tab, viewingProfile, setTab, setViewingProfile]);

  // ── Back button (Android hardware) ────────────────────────────────────────
  useEffect(() => {
    const handleBack = () => {
      // 0. If a DM chat is open, close it first
      if (window.__echoChatOpen && window.__echoChatOnBack) {
        window.__echoChatOnBack();
        return;
      }

      // 1. Close any open sheet/modal inside the current screen
      if (popModal()) return;

      // 2. Close compose
      if (composing) { setComposing(false); return; }

      // 3. Close exit dialog
      if (exitPrompt) { setExitPrompt(false); return; }

      // 4. Navigate back through page history
      if (navStack.current.length > 0) {
        const prev = navStack.current.pop();
        setTab(prev.tab);
        setViewingProfile(prev.viewingProfile ?? null);
        return;
      }

      // 5. At root home — ask to exit
      if (tab === "home" && !viewingProfile) {
        setExitPrompt(true);
        return;
      }

      // 6. Any other tab — go home
      navStack.current = [];
      setTab("home");
      setViewingProfile(null);
    };

    let removeListener;
    const setup = async () => {
      try {
        const { App: CapApp } = await import("../capacitor-app-shim.js");
        const listener = await CapApp.addListener("backButton", handleBack);
        removeListener = () => listener.remove();
      } catch(_) {
        window.addEventListener("popstate", handleBack);
        removeListener = () => window.removeEventListener("popstate", handleBack);
      }
    };
    setup();
    return () => { if (removeListener) removeListener(); };
  }, [composing, exitPrompt, tab, viewingProfile, popModal, setTab, setViewingProfile, setComposing, setExitPrompt]);

  return { modalStack, navStack, pushModal, popModal, switchTab, handleUserClick };
}

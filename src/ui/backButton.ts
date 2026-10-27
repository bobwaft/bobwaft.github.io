// Back button for focus views (D-4): fixed corner, DOM, shown only while a focus view is open.

/** True for the Escape key value (including the legacy "Esc"). */
export function isEscapeKey(key: string): boolean {
  return key === 'Escape' || key === 'Esc';
}

export interface BackButton {
  setVisible(visible: boolean): void;
  dispose(): void;
}

/** Creates the Back button; onBack fires for a click and for the Escape key. */
export function createBackButton(onBack: () => void): BackButton {
  const button = document.createElement('button');
  button.id = 'back-button';
  button.type = 'button';
  button.textContent = '← Back';
  button.hidden = true;
  const onClick = () => onBack();
  const onKey = (e: KeyboardEvent) => {
    if (isEscapeKey(e.key)) onBack();
  };
  button.addEventListener('click', onClick);
  window.addEventListener('keydown', onKey);
  document.body.appendChild(button);
  return {
    setVisible(visible) {
      button.hidden = !visible;
    },
    dispose() {
      button.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKey);
      button.remove();
    },
  };
}

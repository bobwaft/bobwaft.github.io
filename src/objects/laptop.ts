// Laptop -> about page (Phase 5). The HTML layer shows only while focused on the laptop.
import { LAPTOP_FOCUS } from '../camera/poses';
import type { InteractableModule } from './types';

export interface LaptopBinding {
  /** Shows or hides the about page's HTML layer. */
  setContentVisible(visible: boolean): void;
}

export interface LaptopModule extends InteractableModule {
  bind(binding: LaptopBinding): void;
}

function createLaptop(): LaptopModule {
  let binding: LaptopBinding | null = null;
  return {
    id: 'laptop',
    label: 'About',
    focus: LAPTOP_FOCUS,
    bind(b) {
      binding = b;
      b.setContentVisible(false);
    },
    onEnter() {
      binding?.setContentVisible(true);
    },
    onExit() {
      binding?.setContentVisible(false);
    },
  };
}

export const laptop = createLaptop();

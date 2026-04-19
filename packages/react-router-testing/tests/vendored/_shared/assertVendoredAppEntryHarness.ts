import { expect, it } from 'vitest';

const ROOT_IDS = ['app', 'root'];

const ensureRoot = (id: string): HTMLElement => {
  const existing = document.getElementById(id);
  if (existing) return existing;

  const element = document.createElement('div');
  element.id = id;
  document.body.appendChild(element);
  return element;
};

const resetRoots = (): void => {
  for (const id of ROOT_IDS) {
    ensureRoot(id).replaceChildren();
  }
};

const hasMountedContent = (element: HTMLElement): boolean => element.childNodes.length > 0 || (element.shadowRoot?.childNodes.length ?? 0) > 0;

const mountedRoots = (): HTMLElement[] => ROOT_IDS.map((id) => ensureRoot(id)).filter(hasMountedContent);

const waitForMountedRoot = async (): Promise<HTMLElement[]> => {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const mounted = mountedRoots();
    if (mounted.length > 0) return mounted;
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 50);
    });
  }
  return mountedRoots();
};

export const assertVendoredAppEntryHarness = (loadEntry: () => Promise<unknown>): void => {
  it('boots the browser entrypoint into a DOM root', async () => {
    resetRoots();

    await loadEntry();
    const mounted = await waitForMountedRoot();
    expect(mounted.length).toBeGreaterThan(0);
  });
};

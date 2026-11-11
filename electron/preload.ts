import { contextBridge } from 'electron';

const notImplemented =
  (name: string) =>
  (..._args: unknown[]): Promise<never> =>
    Promise.reject(new Error(`${name} 尚未实现`));

contextBridge.exposeInMainWorld('packingAPI', {
  recommend: notImplemented('recommend'),
  getSettings: notImplemented('getSettings'),
  setSettings: notImplemented('setSettings'),
  importCsv: notImplemented('importCsv'),
});

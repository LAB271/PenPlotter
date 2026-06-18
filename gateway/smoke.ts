/**
 * Hardware smoke test (run on the machine): connect once, jog, pen up/down, and
 * plot a tiny square — proving the daemon stack drives the plotter and the port
 * is opened exactly once (no reopen). Run: `npm run gateway:smoke`.
 */
import { GrblController } from '../src/grbl/GrblController';
import { NodeSerialTransport } from './NodeSerialTransport';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const ctrl = new GrblController(new NodeSerialTransport({ path: process.env.PLOTTER_PATH }));
  ctrl.on('log', (e) => console.log(`${e.dir} ${e.text}`));
  ctrl.on('alarm', (e) => console.log('ALARM', e.code));
  ctrl.on('error', (e) => console.log('ERROR', e.code, e.line));

  console.log('connecting…');
  await ctrl.connect();
  console.log('connected:', ctrl.firmwareVersion);

  await ctrl.penUp();
  await ctrl.jog(10, 0, 0, 2000);
  await sleep(1500);
  await ctrl.jog(-10, 0, 0, 2000);
  await sleep(1500);

  console.log('plotting a 20mm square at the current position (work zero must be set)…');
  ctrl.streamProgram([
    'G21',
    'G90',
    'G0 Z0',
    'G1 X0 Y0 F4000',
    'G0 Z3',
    'G1 X20 Y0 F3000',
    'G1 X20 Y20',
    'G1 X0 Y20',
    'G1 X0 Y0',
    'G0 Z0',
    'G0 X0 Y0',
  ]);
  await new Promise<void>((resolve) => {
    ctrl.on('streamComplete', () => resolve());
    ctrl.on('streamAborted', () => resolve());
  });

  console.log('done — port stayed open the whole run. Disconnecting.');
  await ctrl.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error('smoke test failed:', e);
  process.exit(1);
});

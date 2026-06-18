import { describe, expect, it } from 'vitest';
import { classifyLine, parseStatus } from '../parse';

describe('classifyLine', () => {
  it('recognizes ok', () => {
    expect(classifyLine('ok')).toEqual({ kind: 'ok' });
  });

  it('recognizes error codes', () => {
    expect(classifyLine('error:20')).toEqual({ kind: 'error', code: 20 });
  });

  it('recognizes alarms', () => {
    expect(classifyLine('ALARM:1')).toEqual({ kind: 'alarm', code: 1 });
  });

  it('parses setting lines', () => {
    expect(classifyLine('$130=1189.000')).toEqual({
      kind: 'setting',
      num: 130,
      value: 1189,
    });
  });

  it('recognizes the GRBL banner with version', () => {
    expect(classifyLine("Grbl 1.1h ['$' for help]")).toEqual({
      kind: 'banner',
      version: '1.1h',
    });
  });

  it('classifies status reports', () => {
    const line = classifyLine('<Idle|MPos:0.000,0.000,0.000|FS:0,0>');
    expect(line.kind).toBe('status');
  });

  it('treats bracketed feedback as a message', () => {
    expect(classifyLine('[MSG:Pgm End]')).toEqual({
      kind: 'message',
      text: 'MSG:Pgm End',
    });
  });
});

describe('parseStatus', () => {
  it('parses the real machine status format', () => {
    const r = parseStatus('<Run|MPos:120.500,88.200,3.000|FS:1500,0|WCO:0.000,0.000,0.000>');
    expect(r).not.toBeNull();
    expect(r!.state).toBe('Run');
    expect(r!.mpos).toEqual({ x: 120.5, y: 88.2, z: 3 });
    expect(r!.feed).toBe(1500);
  });

  it('derives MPos from WPos + WCO when only WPos is reported', () => {
    const r = parseStatus('<Idle|WPos:10.000,20.000,0.000|WCO:5.000,5.000,0.000>');
    expect(r!.mpos).toEqual({ x: 15, y: 25, z: 0 });
  });

  it('strips the substate so a feed hold parses as Hold (not Unknown)', () => {
    const r = parseStatus('<Hold:0|MPos:120.500,88.200,3.000|FS:0,0>');
    expect(r!.state).toBe('Hold');
  });

  it('returns null for unparseable reports', () => {
    expect(parseStatus('<>')).toBeNull();
  });
});

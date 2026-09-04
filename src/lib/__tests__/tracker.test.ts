import { describe, it, expect } from 'vitest';
import { classifyCameraError } from '../tracker';

/* A camera that will not start is four or five different problems with
   different remedies. Collapsing them into "it didn't work" leaves the one
   person who could fix it with nothing to act on. */
describe('classifyCameraError', () => {
  it.each([
    ['NotAllowedError', 'permission'],
    ['PermissionDeniedError', 'permission'],
    ['NotFoundError', 'no_device'],
    ['DevicesNotFoundError', 'no_device'],
    ['NotReadableError', 'device_busy'],
    ['TrackStartError', 'device_busy'],
    ['OverconstrainedError', 'constraints'],
    ['SecurityError', 'insecure_origin'],
  ])('maps %s to %s', (name, expected) => {
    const err = new Error('x');
    err.name = name;
    expect(classifyCameraError(err)).toBe(expected);
  });

  it('falls back to unknown rather than guessing', () => {
    const err = new Error('something else');
    err.name = 'WeirdError';
    expect(classifyCameraError(err)).toBe('unknown');
  });

  it('does not throw on a non-Error rejection', () => {
    expect(classifyCameraError(undefined)).toBe('unknown');
    expect(classifyCameraError('nope')).toBe('unknown');
  });

  it('never reports a denied permission as a missing device', () => {
    // The two remedies are opposite: one is a settings change, the other is
    // "use a different machine".
    const denied = new Error('Permission denied');
    denied.name = 'NotAllowedError';
    expect(classifyCameraError(denied)).not.toBe('no_device');
  });
});

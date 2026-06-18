# gcode-streaming Specification

## Purpose

Stream G-code programs to the GRBL controller reliably, using character-counting flow control, with error and alarm handling, accurate completion detection, and operator stream control (pause/resume/stop).

## Requirements

### Requirement: Character-counting flow control

The system SHALL stream G-code using a character-counting protocol: it MUST track the total byte length of lines that have been sent but not yet acknowledged, and MUST only send the next line while that total (including the next line's length and its terminator) stays at or below GRBL's serial RX buffer limit of 128 bytes. Each received `ok`/`error:N` MUST free the byte count of the oldest unacknowledged line.

#### Scenario: Pipe kept full without overflow

- **WHEN** a dense G-code program (many short segments) is streamed
- **THEN** the app continuously sends lines so long as unacknowledged bytes ≤ 128, keeping GRBL's planner full so motion does not stutter, and never sends a line that would exceed the 128-byte window

#### Scenario: Acknowledgement frees the window

- **WHEN** an `ok` is received for the oldest in-flight line
- **THEN** that line's byte count is removed from the in-flight total and the app sends further queued lines if the window now permits

### Requirement: Abort on error

The system SHALL treat an `error:N` response during streaming as a fatal job error: it MUST stop sending further lines, surface the offending line and the GRBL error code to the operator, and place the sender in an error state.

#### Scenario: Mid-stream error aborts the job

- **WHEN** GRBL returns `error:N` for a streamed line
- **THEN** the app stops streaming, reports the offending line text and error code, and does not send the remaining program

### Requirement: Alarm handling

The system SHALL detect `ALARM:N` reports, halt streaming, and inform the operator that the machine is in an alarm state requiring an unlock (`$X`) or reset before further motion.

#### Scenario: Alarm halts and informs

- **WHEN** GRBL emits `ALARM:N`
- **THEN** streaming halts and the operator is told the machine is alarmed and how to clear it (`$X` unlock or soft reset)

### Requirement: Accurate completion detection

The system SHALL consider a job complete only when both conditions hold: the line queue is empty (all lines acknowledged) AND GRBL reports state `Idle`. It MUST NOT report completion merely because the final line was acknowledged.

#### Scenario: Completion waits for Idle

- **WHEN** the last line of a program is acknowledged but GRBL still reports `Run`
- **THEN** the app continues to show the job as in progress until GRBL reports `Idle`, then reports completion

### Requirement: Stream control

The system SHALL allow the operator to pause (feed hold `!`), resume (`~`), and stop a running stream. A stop MUST halt sending and bring the machine to a safe stop (feed hold then reset).

#### Scenario: Pause and resume

- **WHEN** the operator pauses during a stream
- **THEN** a feed hold (`!`) is sent and motion stops; on resume a cycle start (`~`) is sent and motion continues from where it paused

#### Scenario: Stop aborts the run

- **WHEN** the operator stops during a stream
- **THEN** the app stops sending queued lines and brings the machine to a stop, leaving it ready for a new job

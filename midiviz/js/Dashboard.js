class Dashboard {
  constructor() {
    this.colors = Constants.VIZ_COLORS;
    this.usedColors = [];
    this.midiFiles = {};
    this.hiddenMidiFiles = {};

    this.midiPlayer;
    this.midiPlayerFile;

    this.mappings = {};
    this.setMappings();

    this.panes = {
      midiFiles: new MidiFilePane(this),
      notesPlayed: new NotesPlayedPane(this),
      notesVelocity: new NotesVelocityPane(this),
      notesFrequency: new NotesFrequencyPane(this),
      graphView: new GraphViewPane(this)
    };
  }

  clearSvgs() {
    d3.selectAll("svg")
      .html("")
      .selectAll("*")
      .remove();
  }

  setMappings() {
    this.mappings = {
      notes: this.getNotesMapping(),
      frequency: this.getFrequencyMapping(),
      velocity: this.getVelocityMapping()
    };
  }

  /**
   * Populates mapping for purposes of master note over time graph.
   *
   * e.g.
   * [{time: 0, name: "1.mid", note: "C5", velocity: 50, duration: 54, color: "green"},
   *  ...]
   */
  getNotesMapping() {
    var mapping = [];
    for (const [name, midiFile] of Object.entries(this.midiFiles)) {
      var track = midiFile.track;
      track.forEach(function(midiEvent) {
        var runningTime = 0;
        for (var i = 0; i < midiEvent.event.length; i++) {
          var currentEvent = midiEvent.event[i];
          runningTime += currentEvent.deltaTime;

          if (currentEvent.type == 9 && currentEvent.data[1] > 0) {
            // Note is "noteOn" event
            var currentNote = currentEvent.data[0];
            var runningTimeSinceCurrent = 0;

            // Find corresponding "noteOff"/"noteOff" event
            // There are two ways to end a note, have a type=8 (noteOff) event, or a type=9 (noteOn) with 0 volume

            // Low-pri TODO: This algorithm is slow, worst-case O(n^2) where n is notes, if all notes are long
            // Using a map instead should be guaranteed 1 run through. But in practicee this is quick.
            for (var j = i + 1; j < midiEvent.event.length; j++) {
              var nextEvent = midiEvent.event[j];
              runningTimeSinceCurrent += nextEvent.deltaTime;
              if ("data" in nextEvent && nextEvent.data.length > 0) {
                var nextNote = nextEvent.data[0];
                if (
                  (nextEvent.type == 8 || nextEvent.type == 9) &&
                  nextNote == currentNote &&
                  currentEvent.channel == nextEvent.channel
                ) {
                  mapping.push({
                    name: name,
                    time: runningTime,
                    duration: runningTimeSinceCurrent,
                    velocity: currentEvent.data[1],
                    note: Constants.NOTE_MAPPING[nextNote],
                    color: midiFile.color
                  });
                  break;
                }
              }
            }
          }
        }
      });
    }
    mapping.sort(
      (a, b) =>
        Constants.NOTE_MAPPING.indexOf(b.note) -
        Constants.NOTE_MAPPING.indexOf(a.note)
    );
    return mapping;
  }

  /**
   * Generate a mapping of timestmaps and velocities.
   *
   * [{name: "3.mid", time: 10, velocity: 201, note: "F#4", color: "#a6cee3"}, ...]
   */
  getVelocityMapping() {
    var mapping = [];
    for (const [name, midiFile] of Object.entries(this.midiFiles)) {
      var track = midiFile.track;
      track.forEach(function(midiEvent) {
        var runningTime = 0;
        midiEvent.event.forEach(function(d) {
          runningTime += d.deltaTime;
          if (d.type == 9 && d.data[1] > 0) {
            var existingTimestamp;
            for (var timestamp of mapping) {
              if (
                timestamp["name"] == name &&
                timestamp["time"] == runningTime
              ) {
                existingTimestamp = timestamp;
                break;
              }
            }
            if (existingTimestamp) {
              existingTimestamp.loVelocity = Math.min(
                d.data[1],
                existingTimestamp.loVelocity
              );
              existingTimestamp.hiVelocity = Math.max(
                d.data[1],
                existingTimestamp.hiVelocity
              );
            } else {
              mapping.push({
                name: name,
                time: runningTime,
                loVelocity: d.data[1],
                hiVelocity: d.data[1],
                color: midiFile.color
              });
            }
          }
        });
      });
    }
    mapping.sort((a, b) => a.time - b.time);
    return mapping;
  }

  /**
   * Populates a mapping based on note frequency.
   */
  getFrequencyMapping() {
    var mapping = [];
    for (const [name, midiFile] of Object.entries(this.midiFiles)) {
      var track = midiFile.track;
      track.forEach(function(midiEvent) {
        midiEvent.event.forEach(function(d) {
          if (d.type == 9 && d.data[1] > 0) {
            var find = Constants.NOTE_MAPPING[d.data[0]];
            var found = false;
            for (var i = 0; i < mapping.length && !found; i++) {
              if (mapping[i]["name"] == name && mapping[i]["note"] == find) {
                mapping[i]["count"] += 1;
                found = true;
              }
            }
            if (!found) {
              mapping.push({
                name: name,
                color: midiFile.color,
                note: find,
                count: 1
              });
            }
          }
        });
      });
    }

    // Identify mismatches and add match parameter
    const master = mapping.filter(item => item.name == mapping[0].name);
    const files = [...new Set(mapping.map(item => item.name))];
    master.forEach(function(d) {
      const notes = mapping.filter(item => item.note == d.note);
      const match = notes.every(item => item.count == notes[0].count);
      notes.forEach(item => (item.match = match));
      notes.forEach(item => (item.fileCount = files.length));
    });

    return mapping;
  }

  setupGraphs() {
    this.clearSvgs();
    if (Object.keys(this.midiFiles).length > 0) {
      this.setMappings();
      this.panes.notesPlayed.graph();
      this.panes.notesFrequency.graph();
      this.panes.notesVelocity.graph();
      this.applyTooltips();
    }
  }

  /**
   * Activates tooltips using Tippy.js.
   *
   * Tooltips should have class "tipped" with the tooltip in attr "data-tippy-content".
   * Needs to be done whenever new elements with tooltips are added.
   */
  applyTooltips() {
    tippy(".tipped", {
      arrow: true,
      animateFill: false,
      size: "small",
      maxWidth: 200,
      interactiveBorder: 8
    });
  }
}

let dashboard = new Dashboard();

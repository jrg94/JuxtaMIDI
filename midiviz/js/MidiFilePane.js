class MidiFilePane {
  constructor(dashboard) {
    this.dashboard = dashboard;
    this.setupUploadButton();
  }

  setupUploadButton() {
    MIDIParser.parse(document.getElementById("input-file"), this.midiLoadCallback.bind(this));
  }

  /**
   * The midi load callback function. Loads the midi file, logs it,
   * and plots it on a histogram.
   *
   * @param {Object} midiFile - a parsed midi file as JSON
   */
  midiLoadCallback(midiFile) {
    if (this.dashboard.colors.length == 0) {
      alert("Max MIDI files supported is " + this.dashboard.usedColors.length);
    } else {
      var fileList = document.getElementById("input-file");
      var latestFile = fileList.files[fileList.files.length - 1];
      if (latestFile.name in this.dashboard.midiFiles) {
        alert("MIDI file with name " + latestFile.name + " is already loaded!");
      } else {
        var midiColor = this.dashboard.colors.splice(0, 1)[0];
        this.dashboard.midiFiles[latestFile.name] = midiFile;
        this.dashboard.midiFiles[latestFile.name].file = latestFile;
        this.dashboard.midiFiles[latestFile.name].color = midiColor;
        this.dashboard.usedColors.push(midiColor);
        this.dashboard.setMappings();
        this.dashboard.panes.graphView.switchToPane(Views.ALL);

        this.buildFileList();
      }
    }
  }

  /**
   * Set up file list pane from this.dashboard.midiFiles object, sets up appropriate triggers and icons.
   */
  buildFileList() {
    var fileList = document.getElementById("input-file-list");
    this.clearFileList(fileList);

    for (const [name, midiFile] of Object.entries(this.dashboard.midiFiles)) {
      this.addEntryToFileList(fileList, midiFile, name, true)
    }
    for (const [name, midiFile] of Object.entries(this.dashboard.hiddenMidiFiles)) {
      this.addEntryToFileList(fileList, midiFile, name, false)
    }

    this.setupMidiButtons();
  }

  clearFileList() {
    var fileList = document.getElementById("input-file-list");
    while (fileList.firstChild) {
      fileList.removeChild(fileList.firstChild);
    }
  }

  addEntryToFileList(fileList, midiFile, name, toggled) {
    var node = document.createElement("div");
    node.className = "file-list-item";
    node.innerHTML +=
      `<span class="midi-file-name" data-file="${name}">
         ${name}
       </span>
       <div class="icons">
          <div class="icons-left">
            <span class="tipped midi-toggle midi-btn" data-toggled="${(toggled) ? "true" : "false"}" data-file="${name}" data-tippy-content="Toggle file"><i class="icon-toggle-${(toggled) ? "on" : "off"}"></i></span>
            <span class="tipped midi-play midi-btn" data-file="${name}" data-tippy-content="Play file"><i class="icon-play"></i></span>
          </div>
          <div class="icons-right">
            <span class="tipped midi-rename midi-btn" data-file="${name}" data-tippy-content="Rename file"><i class="icon-pencil"></i></span>
            <span class="tipped midi-delete midi-btn" data-file="${name}" data-tippy-content="Delete file"><i class="icon-trash"></i></span>
          </div>
        </div>`;
    node.style.backgroundColor = midiFile.color;
    fileList.appendChild(node);
  }

  /**
   * Set up midi buttons in the file pane (toggle, rename, delete).
   */
  setupMidiButtons() {
    var pane = this;
    d3.selectAll(".midi-toggle").on("click", function() {
      var midiFile = d3.select(this).attr("data-file");
      pane.toggleMidiFile(midiFile);
    });

    d3.selectAll(".midi-rename").on("click", function() {
      var midiFile = d3.select(this).attr("data-file");
      if (!pane.renameMidiFile(midiFile)) {
        alert("Please pick a unique MIDI file name.");
      }
    });

    d3.selectAll(".midi-delete").on("click", function() {
      var midiFile = d3.select(this).attr("data-file");
      pane.deleteMidiFile(midiFile);
    });

    d3.selectAll(".midi-play").on("click", function() {
      var midiFile = d3.select(this).attr("data-file");
      pane.playPauseMidiFile(midiFile);
    });
  }

  /**
   * Toggle specified MIDI file from view. Returns the new state, true if on, false if off.
   *
   * TODO: There could be some cap on this later about how many files can be toggled?
   */
  toggleMidiFile(midiFile) {
    var toggleSpan = d3.select(`span.midi-toggle[data-file="${midiFile}"]`);
    var toggleSpanIcon = toggleSpan.select("i");
    var toggled = toggleSpan.attr("data-toggled");
    if (toggled == "false") { // off -> on
      toggleSpan.attr("data-toggled", "true");
      toggleSpanIcon.classed("icon-toggle-on", true);
      toggleSpanIcon.classed("icon-toggle-off", false);

      this.dashboard.midiFiles[midiFile] = {};
      Object.assign(this.dashboard.midiFiles[midiFile], this.dashboard.hiddenMidiFiles[midiFile])
      delete this.dashboard.hiddenMidiFiles[midiFile];
    } else {
      toggleSpan.attr("data-toggled", "false");
      toggleSpanIcon.classed("icon-toggle-on", false);
      toggleSpanIcon.classed("icon-toggle-off", true);

      this.dashboard.hiddenMidiFiles[midiFile] = {};
      Object.assign(this.dashboard.hiddenMidiFiles[midiFile], this.dashboard.midiFiles[midiFile]);
      delete this.dashboard.midiFiles[midiFile];
    }
    if (this.dashboard.midiFiles.length == 0) {
      this.dashboard.panes.graphView.disablePanes();
    } else {
      this.dashboard.panes.graphView.enablePanes();
    }
    this.dashboard.setupGraphs();
    return !toggled;
  }

  /**
   * Rename specified MIDI file.
   * Returns true if successful (or no change), false if failed.
   *
   * TODO: Issue, due to using selectors like [data-file=${midiFile}], we need to disallow double quotes from names.
   */
  renameMidiFile(midiFile) {
    var newMidiFile = prompt("Rename file?", midiFile);
    if (newMidiFile == midiFile) {
      return true;
    } else if (newMidiFile in this.dashboard.midiFiles) {
      return false;
    } else {
      d3.select(`.midi-file-name[data-file="${midiFile}"]`)
        .attr("data-file", newMidiFile)
        .html(newMidiFile);
      d3.selectAll(`.midi-btn[data-file="${midiFile}"]`)
        .attr("data-file", newMidiFile);

      if (midiFile in this.dashboard.midiFiles) {
        this.dashboard.midiFiles[newMidiFile] = {};
        Object.assign(this.dashboard.midiFiles[newMidiFile], this.dashboard.midiFiles[midiFile]);
        delete this.dashboard.midiFiles[midiFile];
      } else {
        this.dashboard.hiddenMidiFiles[newMidiFile] = {};
        Object.assign(this.dashboard.hiddenMidiFiles[newMidiFile], this.dashboard.hiddenMidiFiles[midiFile]);
        delete this.dashboard.hiddenMidiFiles[midiFile];
      }

      if (this.dashboard.midiPlayerMidiFile === midiFile) {
        this.dashboard.midiPlayerMidiFile = newMidiFile;
      }

      this.dashboard.setupGraphs();
      return true;
    }
  }

  /**
   * Given MIDI file, play it.
   */
  playPauseMidiFile(midiFile) {
    var playSpan = d3.select(`span.midi-play[data-file="${midiFile}"]`);
    var playSpanIcon = playSpan.select("i");
    var pause = playSpanIcon.classed("icon-pause");
    if (pause) {
      this.dashboard.midiPlayer.pause();
      playSpanIcon.classed("icon-play", true);
      playSpanIcon.classed("icon-pause", false)
    } else if (this.dashboard.midiPlayerFile === midiFile) {
      this.dashboard.midiPlayer.play();
      playSpanIcon.classed("icon-play", false);
      playSpanIcon.classed("icon-pause", true);
    } else {
      this.pauseMidiFile(this.dashboard.midiPlayerFile);

      var AudioContext = window.AudioContext || window.webkitAudioContext || false;
      var ac = new AudioContext || new webkitAudioContext;

      var pane = this;

      // TODO: Replace this link with the local version
      Soundfont.instrument(ac, 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/MusyngKite/acoustic_grand_piano-mp3.js').then(function(instrument) {
        var reader = new FileReader();
        var file = (midiFile in pane.dashboard.midiFiles) ? pane.dashboard.midiFiles[midiFile].file : pane.dashboard.hiddenMidiFiles[midiFile].file;
        if (file) {
          reader.readAsArrayBuffer(file);
          reader.addEventListener("load", function() {
            pane.dashboard.midiPlayer = new MidiPlayer.Player(function(event) {
              if (event.name == 'Note on') {
                instrument.play(event.noteName, ac.currentTime, {
                  gain: event.velocity / 100
                });
              }
            });
            pane.dashboard.midiPlayer.on('playing', pane.applyTrackMarker.bind(pane));
            pane.dashboard.midiPlayer.loadArrayBuffer(reader.result);
            pane.dashboard.midiPlayer.play();
            pane.dashboard.midiPlayerFile = midiFile;
            playSpanIcon.classed("icon-play", false);
            playSpanIcon.classed("icon-pause", true);
          }, false);
        } else {
          alert("Error playing MIDI file :'('");
        }
      });
    }
  }

  /**
   * Adds a marker to master graph to signify the time of the current song playing.
   *
   * @param {Object} currentTick - the current tick in the song
   */
  applyTrackMarker(currentTick) {
    for (var graph of ["#notes-over-time", "#velocity-over-time"]) {
      var svg = d3.select(graph);
      var viewBox = svg.attr("viewBox").split(" ");
      var width = parseInt(viewBox[2], 10);
      var height = parseInt(viewBox[3], 10);
      var padding = 50;

      var mapping = this.dashboard.mappings.velocity;
      var maxTime = mapping[mapping.length - 1].time;

      var xTimeScale = d3.scaleLinear()
        .domain([0, maxTime])
        .range([padding, width - padding]);

      svg.selectAll("line.temp-line")
        .remove();

      svg.append("line")
        .classed("temp-line", true)
        .attr("x1", xTimeScale(currentTick.tick))
        .attr("y1", height - padding)
        .attr("x2", xTimeScale(currentTick.tick))
        .attr("y2", padding)
        .attr("stroke-width", 1)
        .attr("stroke", "black")

      svg.selectAll("circle")
        .remove();

      svg.append("circle")
        .attr("fill", this.dashboard.midiFiles[this.dashboard.midiPlayerFile].color)
        .attr("cx", xTimeScale(currentTick.tick))
        .attr("cy", height - padding)
        .attr("r", 4);
    }
  }

  /**
   * Delete specified MIDI file, adjusting view panes and graphs as necessary.
   */
  deleteMidiFile(midiFile) {
    var element = d3.select(`.midi-file-name[data-file="${midiFile}"]`).node().parentNode;
    element.parentNode.removeChild(element);

    var removedMidiColor = this.dashboard.midiFiles[midiFile].color;
    this.dashboard.colors.unshift(removedMidiColor);
    this.dashboard.usedColors = this.dashboard.usedColors.filter(color => color !== removedMidiColor)

    delete this.dashboard.midiFiles[midiFile];
    this.pauseMidiFile(midiFile);
    this.dashboard.midiPlayerMidiFile = false;

    if (this.dashboard.midiFiles.length == 0) {
      this.dashboard.panes.graphView.disablePanes();
    } else {
      this.buildFileList();
      this.dashboard.panes.graphView.enablePanes();
      dashboard.setupGraphs();
    }
  }


  /**
   * Given MIDI file, pause it if it is beeing played.
   */
  pauseMidiFile(midiFile) {
    if (this.dashboard.midiPlayerFile === midiFile && typeof midiFile != 'undefined' &&
      typeof this.dashboard.midiPlayer != 'undefined') {
      this.dashboard.midiPlayer.pause();
      var playSpan = d3.select(`span.midi-play[data-file="${midiFile}"]`);
      var playSpanIcon = playSpan.select("i");
      playSpanIcon.classed("icon-play", true);
      playSpanIcon.classed("icon-pause", false);
    }
  }
}

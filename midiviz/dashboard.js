const noteLUT = [
  "", "", "", "", "", "", "", "", "", "", "", "",
  "", "", "", "", "", "", "", "", "", "A0", "A#0", "B0",
  "C1", "C#1", "D1", "D#1", "E1", "F1", "F#1", "G1", "G#1", "A1", "A#1", "B1",
  "C2", "C#2", "D2", "D#2", "E2", "F2", "F#2", "G2", "G#2", "A2", "A#2", "B2",
  "C3", "C#3", "D3", "D#3", "E3", "F3", "F#3", "G3", "G#3", "A3", "A#3", "B3",
  "C4", "C#4", "D4", "D#4", "E4", "F4", "F#4", "G4", "G#4", "A4", "A#4", "B4",
  "C5", "C#5", "D5", "D#5", "E5", "F5", "F#5", "G5", "G#5", "A5", "A#5", "B5",
  "C6", "C#6", "D6", "D#6", "E6", "F6", "F#6", "G6", "G#6", "A6", "A#6", "B6",
  "C7", "C#7", "D7", "D#7", "E7", "F7", "F#7", "G7", "G#7", "A7", "A#7", "B7",
  "C8", "C#8", "D8", "D#8", "E8", "F8", "F#8", "G8", "G#8", "A8", "A#8", "B8",
  "C9", "C#9", "D9", "D#9", "E9", "F9", "F#9", "G9"
];

var colors = ["#a6cee3", "#1f78b4", "#b2df8a", "#33a02c", "#fb9a99", "#e31a1c", "#fdbf6f", "#ff7f00", "#cab2d6", "#6a3d9a", "#ffff99", "#b15928"];
var usedColors = [];

var midiFiles = {};
var hiddenMidiFiles = {};
var mappings = {}

// Current MIDI file loaded in player.
var playerMidiFile;

/**
 * Sets up the initial environment.
 */
function setup() {
  // Setup file upload trigger
  var source = document.getElementById('input-file');
  MIDIParser.parse(source, midiLoadCallback);
  setupPaneButtons();
}

setup();

function setMappings() {
  mappings.frequency = getFrequencyMapping();
  mappings.notes = getNotesMapping();
  mappings.velocity = getVelocityMapping();
}

/**
 * Graphs master note graph, showing progression of notes played over time.
 */
function graphNotes() {
  d3.select(".welcome-message").remove();

  var svg = d3.select("#notes-over-time");
  svg.style("display", "inline");

  var keys = Object.keys(midiFiles);

  // TODO: Adjust width here based on parameters? (# of notes, length of song, screen size)?
  // Adjust title formula accordingly. Currently at * 2 for both
  var width = d3.select(".master-graph-pane").node().getBoundingClientRect().width * 2;
  var height = d3.select(".master-graph-pane").node().getBoundingClientRect().height;
  var padding = 60;

  d3.select("#notes-over-time")
    .html("")
    .attr("width", width)
    .attr("height", height);

  let mapping = mappings.notes;
  mapping.sort((a, b) => noteLUT.indexOf(b.note) - noteLUT.indexOf(a.note))

  var xTimeScale = d3.scaleLinear()
    .domain([0, d3.max(mapping, d => d.time + d.duration)])
    .range([padding, width - padding * 2]);

  var yNoteScale = d3.scaleBand()
    .domain(mapping.map(d => d.note))
    .range([height - padding, padding])
    .padding(.1);

  const trackNames = [...new Set(mapping.map(d => d.name))];
  var yTrackScale = d3.scaleBand()
    .domain(trackNames)
    .rangeRound([0, yNoteScale.bandwidth()])
    .padding(0.05);

  svg.append("g")
    .attr("transform", "translate(0," + (height - padding) + ")")
    .call(d3.axisBottom(xTimeScale))
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .attr("transform", "rotate(-45)");

  svg.append("g")
    .attr("transform", "translate(" + padding + ", 0)")
    .call(d3.axisLeft(yNoteScale));

  drawTitle(svg, width / 2, height, padding, "Notes Played");

  svg.append("g")
    .selectAll("g")
    .data(mapping)
    .join("g")
    .attr("transform", d => `translate(0,${yNoteScale(d.note)})`)
    .selectAll("rect")
    .data(d => keys.map(key => {
      return d
    }))
    .join("rect")
    .attr("class", "bar tipped")
    .attr("x", d => xTimeScale(d.time))
    .attr("y", d => yTrackScale(d.name))
    .attr("data-tippy-content", (d) => `${d.name}<br>note: ${d.note}<br>start: ${d.time}<br>velocity: ${d.velocity}<br>duration: ${d.duration}`)
    .attr("width", d => xTimeScale(d.duration) - padding)
    .attr("height", yTrackScale.bandwidth())
    //.attr("stroke", "black") // TODO: Might want stroke here for distinguishing overlap? Not sure.
    .attr("fill", d => d.color);
}

/**
 * Populates mapping for purposes of master note over time graph.
 *
 * e.g.
 * [{time: 0, name: "1.mid", note: "C5", velocity: 50, duration: 54, color: "green"},
 *  ...]
 */
function getNotesMapping() {
  var mapping = []
  for (const [name, midiFile] of Object.entries(midiFiles)) {
    var track = midiFile.track;
    track.forEach(function(midiEvent) {
      var runningTime = 0;
      for (var i = 0; i < midiEvent.event.length; i++) {
        var currentEvent = midiEvent.event[i];
        runningTime += currentEvent.deltaTime;

        if (currentEvent.type == 9 && currentEvent.data[1] > 0) { // Note is "noteOn" event
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
              if ((nextEvent.type == 8 || nextEvent.type == 9) && nextNote == currentNote && currentEvent.channel == nextEvent.channel) {
                mapping.push({
                  name: name,
                  time: runningTime,
                  duration: runningTimeSinceCurrent,
                  velocity: currentEvent.data[1],
                  note: noteLUT[nextNote],
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
  return mapping;
}

/**
 * Graphs velocity over time graph.
 * TODO: Bug fix: when 2 bars are different due to one being 0 and another being >0, the opacity is 0.2 instead of 1.0.
 */
function graphVelocity() {
  var svg = d3.select("#velocity-over-time");

  var width = d3.select(".velocity-over-time-graph-pane").node().getBoundingClientRect().width * 2;
  var height = d3.select(".velocity-over-time-graph-pane").node().getBoundingClientRect().height;
  var padding = 60;

  var keys = Object.keys(midiFiles);
  var timestamps = mappings.velocity;
  timestamps.sort((a, b) => a.time - b.time)

  d3.select("#velocity-over-time")
    .html("")
    .attr("width", width)
    .attr("height", height);

  var xTimeScale = d3.scaleLinear()
    .domain([0, d3.max(timestamps, d => d.time)])
    .range([padding, width - padding * 2]);

  var yVelocityScale = d3.scaleLinear()
    .domain([d3.min(timestamps, d => d.loVelocity - 15), d3.max(timestamps, d => d.hiVelocity + 15)])
    .range([height - padding, padding]);

  svg.append("g")
    .attr("transform", "translate(0," + (height - padding) + ")")
    .call(d3.axisBottom(xTimeScale))
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .attr("transform", "rotate(-45)");

  svg.append("g")
    .attr("transform", "translate(" + padding + ", 0)")
    .call(d3.axisLeft(yVelocityScale));

  var subsets = keys.map(key => timestamps.filter(d => d.name == key));

  var area = d3.area()
    .x(d => xTimeScale(d.time))
    .y0(d => yVelocityScale(d.loVelocity))
    .y1(d => yVelocityScale(d.hiVelocity))
    .curve(d3.curveCardinal);

  svg.append("g")
    .selectAll("path")
    .data(subsets)
    .join("path")
    .attr("stroke", d => (d.length > 0 && "color" in d[0]) ? d[0].color : "black" )
    .attr("fill", d => d[0].color + "33")
    .attr("d", area);

  for (velocity of ["loVelocity", "hiVelocity"]) {
    // These dots are invisible but are used for tooltips
    svg.append("g")
      .selectAll(".dot")
      .data(timestamps)
      .enter()
      .append("circle")
      .attr("class", "tipped")
      .attr("fill", "transparent")
      .attr("stroke", "transparent")
      .attr("cx", d => xTimeScale(d.time))
      .attr("cy", d => yVelocityScale(d[velocity]))
      .attr("r", 3)
      .attr("data-tippy-content", d => `${d.name}<br>time: ${d.time}<br>hi velocity: ${d.hiVelocity}<br>lo velocity: ${d.loVelocity}`);
  }

  drawTitle(svg, width / 2, height, padding, "Note Velocity");
}

/**
 * Generate a mapping of timestmaps and velocities.
 *
 * [{name: "3.mid", time: 10, velocity: 201, note: "F#4", color: "#a6cee3"}, ...]
 */
function getVelocityMapping() {
  var mapping = []
  for (const [name, midiFile] of Object.entries(midiFiles)) {
    var track = midiFile.track;
    track.forEach(function(midiEvent) {
      runningTime = 0;
      midiEvent.event.forEach(function(d) {
        runningTime += d.deltaTime;
        if (d.type == 9 && d.data[1] > 0) {
          var existingTimestamp;
          for (timestamp of mapping) {
            if (timestamp["name"] == name && timestamp["time"] == runningTime) {
              existingTimestamp = timestamp;
              break;
            }
          }
          if (existingTimestamp) {
            existingTimestamp.loVelocity = Math.min(d.data[1], existingTimestamp.loVelocity);
            existingTimestamp.hiVelocity = Math.max(d.data[1], existingTimestamp.hiVelocity);
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
  return mapping;
}

/**
 * Creates the note frequency graph.
 */
function graphFrequency() {
  var svg = d3.select("#note-frequency");

  var width = d3.select(".note-frequency-graph-pane").node().getBoundingClientRect().width;
  var height = d3.select(".note-frequency-graph-pane").node().getBoundingClientRect().height;
  var padding = 60;
  // TODO: Separate this padding into a map? top/bottom/left/right. It appears inconsistently centered now.

  d3.select("#note-frequency")
    .html("")
    .attr("width", width)
    .attr("height", height);

  var keys = Object.keys(midiFiles);
  var mapping = mappings.frequency;
  mapping.sort((a, b) => b.count - a.count);

  var xNoteScale = d3.scaleBand()
    .domain(mapping.map(d => d.note))
    .range([padding, width - padding * 2])
    .padding(.1);

  const trackNames = [...new Set(mapping.map(d => d.name))];
  var xTrackScale = d3.scaleBand()
    .domain(trackNames)
    .rangeRound([0, xNoteScale.bandwidth()])
    .padding(0.05);

  var yScale = d3.scaleLinear()
    .domain([0, d3.max(mapping, d => d.count)])
    .range([height - padding, padding]);

  svg.append("g")
    .attr("transform", "translate(0," + (height - padding) + ")")
    .call(d3.axisBottom(xNoteScale))
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .attr("transform", "rotate(-45)");

  svg.append("g")
    .attr("transform", "translate(" + padding + ", 0)")
    .call(d3.axisLeft(yScale));

  svg.append("g")
    .selectAll("g")
    .data(mapping)
    .join("g")
    .attr("transform", d => `translate(${xNoteScale(d.note)},0)`)
    .selectAll("rect")
    .data(d => keys.map(key => {
      return d
    }))
    .join("rect")
    .attr("class", "bar tipped")
    .attr("x", d => xTrackScale(d.name))
    .attr("y", d => yScale(d.count))
    .attr("data-tippy-content", (d) => `${d.name}<br>${d.note}: ${d.count}`)
    .attr("width", xTrackScale.bandwidth())
    .attr("height", d => height - yScale(d.count) - padding)
    .attr("opacity", d => d.match && d.fileCount > 1 ? 0.2 : 1.0)
    .attr("fill", d => d.color);

  drawTitle(svg, width, height, padding, "Note Frequency");
}

/**
 * Populates a mapping based on note frequency.
 */
function getFrequencyMapping() {
  var mapping = [];
  for (const [name, midiFile] of Object.entries(midiFiles)) {
    var track = midiFile.track;
    track.forEach(function(midiEvent) {
      midiEvent.event.forEach(function(d) {
        if (d.type == 9 && d.data[1] > 0) {
          var find = noteLUT[d.data[0]];
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
            })
          }
        }
      });
    });
  }
  detectNoteMismatch(mapping);
  return mapping;
}

/**
 * Helper function for clearing file list.
 * Unused at this time.
 */
function clearFileList(fileList) {
  while (fileList.firstChild) {
    fileList.removeChild(fileList.firstChild);
  }
}

/**
 * Set up file list pane from midiFiles object, sets up appropriate triggers and icons.
 */
function buildFileList() {
  var fileList = document.getElementById("input-file-list");
  clearFileList(fileList);

  for (const [name, midiFile] of Object.entries(midiFiles)) {
    addEntryToFileList(fileList, midiFile, name, true)
  }
  for (const [name, midiFile] of Object.entries(hiddenMidiFiles)) {
    addEntryToFileList(fileList, midiFile, name, false)
  }

  setupMidiButtons();
}

function addEntryToFileList(fileList, midiFile, name, toggled) {
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
function setupMidiButtons() {
  d3.selectAll(".midi-toggle").on("click", function() {
    var midiFile = d3.select(this).attr("data-file");
    toggleMIDIFile(midiFile);
  });

  d3.selectAll(".midi-rename").on("click", function() {
    var midiFile = d3.select(this).attr("data-file");
    if (!renameMIDIFile(midiFile)) {
      alert("Please pick a unique MIDI file name.");
    }
  });

  d3.selectAll(".midi-delete").on("click", function() {
    var midiFile = d3.select(this).attr("data-file");
    deleteMIDIFile(midiFile);
  });

  d3.selectAll(".midi-play").on("click", function() {
    var midiFile = d3.select(this).attr("data-file");
    playPauseMIDIFile(midiFile);
  });
}

function clearSVGs() {
  d3.selectAll("svg")
    .attr("height", null) // Reset width/height here, otherwise it carries over changes
    .attr("width", null)
    .selectAll("*")
    .remove();
}

/**
 * The midi load callback function. Loads the midi file, logs it,
 * and plots it on a histogram.
 *
 * @param {Object} midiFile - a parsed midi file as JSON
 */
function midiLoadCallback(midiFile) {
  if (colors.length == 0) {
    alert("Max MIDI files supported is " + usedColors.length);
  } else {
    var fileList = document.getElementById("input-file");
    var latestFile = fileList.files[fileList.files.length - 1];
    if (latestFile.name in midiFiles) {
      alert("MIDI file with name " + latestFile.name + " is already loaded!");
    } else {
      var midiColor = colors.splice(0, 1)[0];
      midiFiles[latestFile.name] = midiFile;
      midiFiles[latestFile.name].file = latestFile;
      midiFiles[latestFile.name].color = midiColor;
      usedColors.push(midiColor);
      buildFileList();
      setMappings();
      switchToPane(PANE_ALL);
    }
  }
}

/**
 * Clear and draw all graphs.
 */
function setupGraphs() {
  clearSVGs();
  if (Object.keys(midiFiles).length > 0) {
    setMappings();
    graphNotes();
    graphFrequency();
    graphVelocity();
    applyTooltips();
  }
}

/**
 * A helper function for detecting note mismatches over a list of
 * note data points.
 *
 * @param mapping - a list of processed midi objects
 */
function detectNoteMismatch(mapping) {
  const master = mapping.filter(item => item.name == mapping[0].name);
  const files = [...new Set(mapping.map(item => item.name))];
  master.forEach(function(d) {
    const notes = mapping.filter(item => item.note == d.note);
    const match = notes.every(item => item.count == notes[0].count);
    notes.forEach(item => item.match = match);
    notes.forEach(item => item.fileCount = files.length);
  });
}

/**
 * Draws a title on the master SVG
 */
function drawTitle(svg, width, height, padding, title) {
  svg.append("text")
    .attr("class", "title")
    .attr("dy", padding / 2)
    .attr("dx", ((width / 2) - padding / 2))
    .style("text-anchor", "middle")
    .style("font-size", "18px")
    .text(title)
}

/**
 * Activates tooltips using Tippy.js.
 *
 * Tooltips should have class "tipped" with the tooltip in attr "data-tippy-content".
 * Needs to be done whenever new elements with tooltips are added.
 */
function applyTooltips() {
  tippy(".tipped", {
    arrow: true,
    animateFill: false,
    size: "small",
    maxWidth: 200,
    interactiveBorder: 8
  })
}

/**
 * Toggle specified MIDI file from view. Returns the new state, true if on, false if off.
 *
 * TODO: There could be some cap on this later about how many files can be toggled?
 */
function toggleMIDIFile(midiFile) {
  var toggleSpan = d3.select(`span.midi-toggle[data-file="${midiFile}"]`);
  var toggleSpanIcon = toggleSpan.select("i");
  var toggled = toggleSpan.attr("data-toggled");
  if (toggled == "false") { // off -> on
    toggleSpan.attr("data-toggled", "true");
    toggleSpanIcon.classed("icon-toggle-on", true);
    toggleSpanIcon.classed("icon-toggle-off", false);
    midiFiles[midiFile] = {};
    Object.assign(midiFiles[midiFile], hiddenMidiFiles[midiFile])
    delete hiddenMidiFiles[midiFile];
  } else {
    toggleSpan.attr("data-toggled", "false");
    toggleSpanIcon.classed("icon-toggle-on", false);
    toggleSpanIcon.classed("icon-toggle-off", true);
    hiddenMidiFiles[midiFile] = {};
    Object.assign(hiddenMidiFiles[midiFile], midiFiles[midiFile]);
    delete midiFiles[midiFile];
  }
  if (midiFiles.length == 0) {
    disablePanes();
  } else {
    enablePanes();
  }
  setupGraphs();
  return !toggled;
}

/**
 * Rename specified MIDI file.
 * Returns true if successful (or no change), false if failed.
 *
 * TODO: Issue, due to using selectors like [data-file=${midiFile}], we need to disallow double quotes from names.
 */
function renameMIDIFile(midiFile) {
  var newMidiFile = prompt("Rename file?", midiFile);
  if (newMidiFile == midiFile) {
    return true;
  } else if (newMidiFile in midiFiles) {
    return false;
  } else {
    d3.select(`.midi-file-name[data-file="${midiFile}"]`)
      .attr("data-file", newMidiFile)
      .html(newMidiFile);
    d3.selectAll(`.midi-btn[data-file="${midiFile}"]`)
      .attr("data-file", newMidiFile);

    if (midiFile in midiFiles) {
      midiFiles[newMidiFile] = {};
      Object.assign(midiFiles[newMidiFile], midiFiles[midiFile]);
      delete midiFiles[midiFile];
    } else {
      hiddenMidiFiles[newMidiFile] = {};
      Object.assign(hiddenMidiFiles[newMidiFile], hiddenMidiFiles[midiFile]);
      delete hiddenMidiFiles[midiFile];
    }

    if (playerMidiFile === midiFile) {
      playerMidiFile = newMidiFile;
    }

    setupGraphs();
    return true;
  }
}

/**
 * Delete specified MIDI file, adjusting view panes and graphs as necessary.
 */
function deleteMIDIFile(midiFile) {
  var element = d3.select(`.midi-file-name[data-file="${midiFile}"]`).node().parentNode;
  element.parentNode.removeChild(element);

  var removedMidiColor = midiFiles[midiFile].color;
  colors.unshift(removedMidiColor);
  usedColors = usedColors.filter(color => color !== removedMidiColor)

  delete midiFiles[midiFile];
  pauseMIDIFile(midiFile);
  playerMidiFile = false;

  if (midiFiles.length == 0) {
    disablePanes();
  } else {
    buildFileList();
    enablePanes();
    setupGraphs();
  }
}

var Player;

/**
 * Given MIDI file, play it.
 * TODO: Allow pause, add cursor to graph, and
 */
function playPauseMIDIFile(midiFile) {
  var playSpan = d3.select(`span.midi-play[data-file="${midiFile}"]`);
  var playSpanIcon = playSpan.select("i");
  var pause = playSpanIcon.classed("icon-pause");
  if (pause) {
    Player.pause();
    playSpanIcon.classed("icon-play", true);
    playSpanIcon.classed("icon-pause", false)
  } else if (playerMidiFile === midiFile) {
    Player.play();
    playSpanIcon.classed("icon-play", false);
    playSpanIcon.classed("icon-pause", true);
  } else {
    var AudioContext = window.AudioContext || window.webkitAudioContext || false;
    var ac = new AudioContext || new webkitAudioContext;
    // TODO: Replace this link with the local version
    Soundfont.instrument(ac, 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/MusyngKite/acoustic_grand_piano-mp3.js').then(function(instrument) {
      var reader = new FileReader();
      var file = (midiFile in midiFiles) ? midiFiles[midiFile].file : hiddenMidiFiles[midiFile].file;
      if (file) {
        reader.readAsArrayBuffer(file);
        reader.addEventListener("load", function () {
          Player = new MidiPlayer.Player(function(event) {
            if (event.name == 'Note on') {
              instrument.play(event.noteName, ac.currentTime, {gain:event.velocity/100});
            }
          });
          Player.on('playing', applyTrackMarker);
          Player.loadArrayBuffer(reader.result);
          Player.play();
          playerMidiFile = midiFile;
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
function applyTrackMarker(currentTick) {
  var svg = d3.select("#notes-over-time");

  var width = d3.select(".master-graph-pane").node().getBoundingClientRect().width * 2;
  var height = d3.select(".master-graph-pane").node().getBoundingClientRect().height;
  var padding = 60;

  let mapping = mappings.notes;
  mapping.sort((a, b) => noteLUT.indexOf(b.note) - noteLUT.indexOf(a.note))

  var xTimeScale = d3.scaleLinear()
    .domain([0, d3.max(mapping, d => d.time + d.duration)])
    .range([padding, width - padding * 2]);

  svg.selectAll("circle").remove();

  svg.append("circle")
    .attr("cx", xTimeScale(currentTick.tick))
    .attr("cy", height - padding)
    .attr("r", 5);
}

/**
 * Given MIDI file, pause it if it is beeing played.
 */
function pauseMIDIFile(midiFile) {
  if (playerMidiFile === midiFile) {
    Player.pause();
  }
}

const PANE_ALL = 0;
const PANE_NOTES = ".master-graph-pane";
const PANE_FREQUENCY = ".note-frequency-graph-pane";
const PANE_VELOCITY = ".velocity-over-time-graph-pane";

function setupPaneButtons() {
  d3.select("#view-all").on("click", function() {
    switchToPane(PANE_ALL);
  });
  d3.select("#view-notes").on("click", function() {
    switchToPane(PANE_NOTES);
  });
  d3.select("#view-frequency").on("click", function() {
    switchToPane(PANE_FREQUENCY);
  });
  d3.select("#view-velocity").on("click", function() {
    switchToPane(PANE_VELOCITY);
  });
}

/**
 * Activates all panes (if disabled), and then switches to desired pane.
 * Use PANE consts above.
 *
 * TODO: Some of this logic and graphing functions are messy and can be cleaned up.
 */
function switchToPane(pane) {
  d3.selectAll(".graph-view-buttons span").classed("disabled-view-button", false);
  d3.selectAll(".graph-view-buttons span").classed("selected-view-button", false);
  if (pane == PANE_ALL) {
    d3.select("#view-all").classed("selected-view-button", true);
    d3.selectAll(".graph-pane").classed("selected-view", false);
    d3.selectAll(".graph-pane").classed("graph-disabled", false);
    d3.selectAll(".graph-pane").classed("single-graph-activated", false);
    clearSVGs();
    graphNotes();
    graphFrequency();
    graphVelocity();
  } else {
    d3.selectAll(".graph-pane").classed("graph-disabled", true);
    d3.select(pane).classed("graph-disabled", false);
    d3.select(pane).classed("selected-view", true);
    switch(pane) {
      case PANE_NOTES:
        d3.select("#view-notes").classed("selected-view-button", true);
        graphNotes();
        break;
      case PANE_FREQUENCY:
        d3.select("#view-frequency").classed("selected-view-button", true);
        graphFrequency();
        break;
      case PANE_VELOCITY:
        d3.select("#view-velocity").classed("selected-view-button", true);
        graphVelocity();
        break;
      default:
    }
  }
  applyTooltips();
}

function disablePanes() {
  d3.selectAll(".graph-view-buttons span").classed("disabled-view-button", true);
}

function enablePanes() {
  d3.selectAll(".graph-view-buttons span").classed("disabled-view-button", false);
}

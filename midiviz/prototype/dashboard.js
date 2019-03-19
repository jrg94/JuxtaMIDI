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
var hiddenMidiFiles = {}

/**
 * Sets up the initial environment.
 */
function setup() {
  // Setup file upload trigger
  var source = document.getElementById('input-file');
  MIDIParser.parse(source, midiLoadCallback);
}

setup();

/**
 * Graphs master note graph, showing progression of notes played over time.
 */
function graphNotes() {
}

/**
 * Graphs velocity over time graph.
 */
function graphVelocity() {
  var svg = d3.select("#velocity-over-time");

  var width = d3.select(".velocity-over-time-graph-pane").node().getBoundingClientRect().width;
  var height = d3.select(".velocity-over-time-graph-pane").node().getBoundingClientRect().height;
  var padding = 60;

  var keys = Object.keys(midiFiles);
  var timestamps = getTimestamps();
  timestamps.sort((a, b) => a.time - b.time)

  d3.select("#velocity-over-time")
    .attr("width", width)
    .attr("height", height);

  var xTimeScale = d3.scaleLinear()
    .domain([0, d3.max(timestamps, d => d.time)])
    .range([padding, width - padding * 2]);

  var yVelocityScale = d3.scaleLinear()
    .domain([d3.min(timestamps, d => d.velocity), d3.max(timestamps, d => d.velocity)])
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

  var line = d3.line()
    .x(d => xTimeScale(d.time))
    .y(d => yVelocityScale(d.velocity))
    .curve(d3.curveMonotoneX)

  var subsets = keys.map(key => timestamps.filter(d => d.name == key));

  svg.append("g")
    .selectAll("path")
    .data(subsets)
    .join("path")
    .attr("fill", d => (d.length > 0 && "color" in d[0]) ? d[0].color : "black" )
    // temp fix: "black" graph should never appear, in theory, since it implies no notes in file
    // but it's here to avoid errors in case there is -- logic can be investigated and improved.
    .style("mix-blend-mode", "multiply")
    .attr("d", line);

  drawTitle(svg, width, height, padding, "Note Velocity");
}

/**
 * Creates the note histogram given a track set.
 *
 */
function graphFrequency() {
  var svg = d3.select("#note-frequency");

  var width = d3.select(".note-frequency-graph-pane").node().getBoundingClientRect().width;
  var height = d3.select(".note-frequency-graph-pane").node().getBoundingClientRect().height;
  var padding = 60;
  // TODO: Separate this padding into a map? top/bottom/left/right. It appears inconsistently centered now.

  d3.select("#note-frequency")
    .attr("width", width)
    .attr("height", height);

  var keys = Object.keys(midiFiles);
  var mapping = populateNoteFrequencyMap();
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
    .attr("data-tippy-content", (d) => (d.name + " " + d.note + ": " + d.count))
    .attr("width", xTrackScale.bandwidth())
    .attr("height", d => height - yScale(d.count) - padding)
    .attr("fill", d => d.color);

  drawTitle(svg, width, height, padding, "Note Frequency");
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
  var keys = Object.keys(midiFiles);
  for (const [name, midiFile] of Object.entries(midiFiles)) {
    var node = document.createElement("div");
    node.className = "file-list-item";
    node.innerHTML +=
      `<span class="midi-file-name" data-file="${name}">
         ${name}
       </span>
       <div class="icons">
          <div class="icons-left">
            <span class="tipped midi-toggle midi-btn" data-toggled="true" data-file="${name}" data-tippy-content="Toggle file"><i class="icon-toggle-on"></i></span>
          </div>
          <div class="icons-right">
            <span class="tipped midi-rename midi-btn" data-file="${name}" data-tippy-content="Rename file"><i class="icon-pencil"></i></span>
            <span class="tipped midi-delete midi-btn" data-file="${name}" data-tippy-content="Delete file"><i class="icon-trash-empty"></i></span>
          </div>
        </div>`;
    node.style.backgroundColor = midiFile.color;
    fileList.appendChild(node);
  }

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
 * @param {Object} obj - a parsed midi file as JSON
 */
function midiLoadCallback(obj) {
  if (colors.length == 0) {
    alert("Max MIDI files supported is " + usedColors.length);
  } else {
    var fileList = document.getElementById("input-file");
    var latestFile = fileList.files[fileList.files.length - 1];
    if (latestFile.name in midiFiles) {
      alert("MIDI file with name " + latestFile.name + " is already loaded!");
    } else {
      var midiColor = colors.splice(0, 1)[0];
      midiFiles[latestFile.name] = obj;
      midiFiles[latestFile.name].color = midiColor;
      usedColors.push(midiColor);
      buildFileList();
      setupGraphs();
    }
  }
}

/**
 * Clear and draw all graphs.
 */
function setupGraphs() {
  clearSVGs();
  if (Object.keys(midiFiles).length > 0) {
    graphNotes();
    graphFrequency();
    graphVelocity();
    applyTooltips();
  }
}

/**
 * A helper function which generates a list of timestamps and velocities
 */
function getTimestamps() {
  var mapping = []
  for (const [name, midiFile] of Object.entries(midiFiles)) {
    var track = midiFile.track;
    track.forEach(function(midiEvent) {
      runningTime = 0;
      midiEvent.event.forEach(function(d) {
        runningTime += d.deltaTime;
        if (d.type == 9) {
          var existingTimestamp = findWithAttributes(mapping, "name", name, "time", runningTime);
          if (existingTimestamp) {
            existingTimestamp.velocity += d.data[1];
          } else {
            mapping.push({
              name: name,
              time: runningTime,
              velocity: d.data[1],
              note: noteLUT[d.data[0]],
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
 * TODO: This function and naming is not clean code - but we're revising the velocity-time graph altogether post-prototype.
 */
function findWithAttributes(list, attr, find, attr2, find2) {
  for (var i = 0; i < list.length; i++) {
    if (list[i][attr] == find && list[i][attr2] == find2) {
      return list[i];
    }
  }
}

/**
 * Populates a mapping based on note frequency.
 */
function populateNoteFrequencyMap() {
  var mapping = [];
  for (const [name, midiFile] of Object.entries(midiFiles)) {
    var track = midiFile.track;
    track.forEach(function(midiEvent) {
      midiEvent.event.forEach(function(d) {
        if (d.type == 9) {
          populateMapping(mapping, "note", "count", noteLUT[d.data[0]], name, midiFile.color);
        }
      });
    });
  }
  return mapping;
}

/**
 * A helper function which populates a mapping given some key string,
 * value string, and value to find for comparison.
 *
 * TODO: This color attribute here is a little unclean code since the method is generic.
 */
function populateMapping(mapping, key, value, find, name, color) {
  var found = false;
  for (var i = 0; i < mapping.length && !found; i++) {
    if (mapping[i]["name"] == name && mapping[i][key] == find) {
      mapping[i][value] += 1;
      found = true;
    }
  }
  if (!found) {
    mapping.push({
      name: name,
      color: color,
      [key]: find,
      [value]: 1
    })
  }
}

/**
 * Draws a title on the master SVG
 *
 * @param {Object} svg - the svg reference
 * @param {number} width - the width of the svg
 * @param {number} height - the height of the svg
 * @param {number} padding - the padding of the svg
 * @param {string} title - the title to be drawn
 */
function drawTitle(svg, width, height, padding, title) {
  svg.append("text")
    .attr("class", "title")
    .attr("dy", padding / 2)
    .attr("dx", ((width / 2) - padding / 2))
    .style("text-anchor", "middle")
    .style("font-size", "20px")
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
    maxWidth: 200
  })
}

/**
 * Toggle specified MIDI file from view. Returns the new state, true if on, false if off.
 *
 * TODO: There should be some cap on this later about how many files can be toggled.
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
  setupGraphs();
  return !toggled;
}

// TODO: Potential issue, due to using selectors like [data-file=${midiFile}], we need to disallow double quotes from names.

/**
 * Rename specified MIDI file.
 *
 * Returns true if successful (or no change), false if failed.
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

    setupGraphs();
    return true;
  }
}

/**
 * Delete specified MIDI file.
 */
function deleteMIDIFile(midiFile) {
  var element = d3.select(`.midi-file-name[data-file="${midiFile}"]`).node().parentNode;
  element.parentNode.removeChild(element);

  var removedMidiColor = midiFiles[midiFile].color;
  colors.unshift(removedMidiColor);
  usedColors = usedColors.filter(color => color !== removedMidiColor)

  delete midiFiles[midiFile];

  buildFileList();
  setupGraphs();
}

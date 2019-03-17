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

const colorLUT = [
  "#7bde2a", "#4087d6", "#c7004c"
]

var midiFiles = {};
var hiddenMidiFiles = {}

/**
 * Sets up the environment to begin working with MIDI files.
 */
function setup() {
  var source = document.getElementById('input');
  MIDIParser.parse(source, midiLoadCallback);
}

/**
 * Creates the note histogram given a track set.
 */
function noteHistogram() {
  var svg = d3.select("#note-frequency");

  var width = d3.select(".note-frequency-graph-pane").node().getBoundingClientRect().width;
  var height = d3.select(".note-frequency-graph-pane").node().getBoundingClientRect().height;
  var padding = 60;
  // TODO: Separate this padding into a map? top/bottom/left/right. It appears inconsistently centered now.

  d3.select("#note-frequency")
    .attr("width", width)
    .attr("height", height);

  var mapping = populateNoteFrequencyMap(midiFiles);
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

  var colorScale = d3.scaleOrdinal()
    .range(colorLUT);

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
    .data(d => keys.map(key => {return {key: key, value: d.count}}))
    .join("rect")
    .attr("class", "bar tipped")
    .attr("x", d => xTrackScale(d.key))
    .attr("y", d => yScale(d.value))
    .attr("data-tippy-content", (d) => (d.key + "<br> ??: " + d.value))
    .attr("width", xTrackScale.bandwidth())
    .attr("height", d => height - yScale(d.value) - padding)
    .attr("fill", d => colorScale(d.key));

  drawTitle(svg, width, height, padding, "Note Histogram");
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
 * Set up file list pane from midiFiles object.
 */
function buildFileList() {
  file_list = document.getElementById("input-file-list");
  clearFileList(file_list);
  keys = Object.keys(midiFiles);
  for (var i = 0; i < keys.length; i++) {
    var node = document.createElement("div");
    node.className = "file-list-item";
    node.innerHTML += keys[i] +
       `<div class="icons">
          <div class="icons-left">
            <span class="tipped midi-toggle" data-file="${keys[i]}" data-tippy-content="Toggle file"><i class="icon-toggle-on"></i></span>
          </div>
          <div class="icons-right">
            <span class="tipped midi-rename" data-file="${keys[i]}" data-tippy-content="Rename file"><i class="icon-pencil"></i></span>
            <span class="tipped midi-remove" data-file="${keys[i]}" data-tippy-content="Delete file"><i class="icon-trash-empty"></i></span>
          </div>
        </div>`;
    node.style.backgroundColor = colorLUT[i % colorLUT.length];
    file_list.appendChild(node);
  }
}

function clearSVGs() {
  d3.selectAll("svg > *").remove();
}

/**
 * The midi load callback function. Loads the midi file, logs it,
 * and plots it on a histogram.
 *
 * @param {Object} obj - a parsed midi file as JSON
 */
function midiLoadCallback(obj) {
  fileList = document.getElementById("input");
  latestFile = fileList.files[fileList.files.length - 1];
  midiFiles[latestFile.name] = obj;
  buildFileList();
  clearSVGs();
  noteHistogram();
  applyTooltips();
  // TODO: Implement other two charts
}

/**
 * Populates a mapping based on note frequency.
 *
 * @param {Object} midiFiles - the set of all midi files
 */
function populateNoteFrequencyMap(midiFiles) {
  var mapping = []
  for (const [name, trackSet] of Object.entries(midiFiles)) {
    var track = trackSet.track;
    track.forEach(function(midiEvent) {
      midiEvent.event.forEach(function(d) {
        if (d.type == 9) {
          populateMapping(mapping, "note", "count", noteLUT[d.data[0]], name);
        }
      });
    });
  }
  return mapping;
}

/**
 * A helper function which populates a mapping given some key string,
 * value string, and value to find for comparison.
 */
function populateMapping(mapping, key, value, find, name) {
  var found = false;
  for (var i = 0; i < mapping.length && !found; i++) {
    if (mapping[i]["name"] == name && mapping[i][key] == find) {
      mapping[i][value] += 1;
      found = true;
    }
  }
  if (!found) {
    mapping.push({
      ["name"]: name,
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
  tippy(".tipped", { arrow: true, animateFill: false, size: "small", maxWidth: 200 })
}

/**
 * Toggle specified MIDI file from view.
 *
 * TODO: There should be some cap on this later.
 */
function toggleMIDIFile(midiFile) {
}

/**
 * Rename specified MIDI file.
 */
function renameMIDIFile(midiFile) {
}

/**
 * Delete specified MIDI file.
 */
function deleteMIDIFile(midiFile) {
}

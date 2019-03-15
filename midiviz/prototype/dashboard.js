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
  "#dc3912", "#8A2BE2"
]

var midiFiles = {};

/**
 * Sets up the environment to begin playing with MIDI files.
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
  var padding = 50;

  d3.select("#note-frequency")
    .attr("width", width)
    .attr("height", height);

  var mappingSet = populateNoteFrequencyMap(midiFiles);
  var [max, uniqueNotes] = getDomains(mappingSet);
  //mapping.sort((a, b) => b.count - a.count);

  var xNoteScale = d3.scaleBand()
    .domain(uniqueNotes)
    .range([padding, width - padding * 2])
    .padding(.1);

  var xTrackScale = d3.scaleBand()
    .domain(Object.keys(mappingSet))
    .rangeRound([0, xNoteScale.bandwidth()])
    .padding(0.05);

  var yScale = d3.scaleLinear()
    .domain([0, max])
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

  svg.selectAll(".bar")
    .data(mappingSet[Object.keys(mappingSet)[0]])
    .enter().append("rect")
    .attr("class", "bar")
    .attr("fill", colorLUT[0])
    .attr("x", d => xNoteScale(d.note))
    .attr("y", d => yScale(d.count))
    .attr("width", xNoteScale.bandwidth())
    .attr("height", d => height - yScale(d.count) - padding);

  drawTitle(svg, width, height, padding, "Note Histogram");
}

/**
 * A helper function for clearing the fileList.
 */
function clearFileList(fileList) {
  while (fileList.firstChild) {
    fileList.removeChild(fileList.firstChild);
  }
}

/**
 * A helpful method for building the file list menu.
 */
function buildFileList() {
  file_list = document.getElementById("input-file-list");
  clearFileList(file_list);
  keys = Object.keys(midiFiles);
  for (var i = 0; i < keys.length; i++) {
    var node = document.createElement("div");
    node.className = "file-list-item";
    node.innerHTML += keys[i];
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
}

/**
 * A helper function for determining all of the unique values in a
 * set for mapping purposes.
 */
function getDomains(mappingSet) {
  var uniqueValues = [];
  var max = 0;
  for (const [name, mapping] of Object.entries(mappingSet)) {
    for (const index in Object.keys(mapping)) {
      if (!uniqueValues.includes(mapping[index].note)) {
        uniqueValues.push(mapping[index].note);
      }
      if (mapping[index].count > max) {
        max = mapping[index].count;
      }
    }
  }
  return [max, uniqueValues];
}

/**
 * Populates a mapping based on note frequency.
 *
 * @param {Object} midiFiles - the set of all midi files
 */
function populateNoteFrequencyMap(midiFiles) {
  var mappingSet = {};
  for (const [name, trackSet] of Object.entries(midiFiles)) {
    var mapping = []
    var track = trackSet.track;
    track.forEach(function(midiEvent) {
      midiEvent.event.forEach(function(d) {
        if (d.type == 9) {
          populateMapping(mapping, "note", "count", noteLUT[d.data[0]]);
        }
      });
    });
    mappingSet[name] = mapping;
  }

  return mappingSet;
}

/**
 * A helper function which populates a mapping given some key string,
 * value string, and value to find for comparison.
 */
function populateMapping(mapping, key, value, find) {
  var found = false;
  for (var i = 0; i < mapping.length && !found; i++) {
    if (mapping[i][key] == find) {
      mapping[i][value] += 1;
      found = true;
    }
  }
  if (!found) {
    mapping.push({
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
    .style("text-decoration", "underline")
    .text(title)
}

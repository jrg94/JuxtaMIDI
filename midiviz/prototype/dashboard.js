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
function noteHistogram(trackSet) {
  var svg = d3.select("#note-frequency");

  var width = d3.select(".note-frequency-graph-pane").node().getBoundingClientRect().width;
  var height = d3.select(".note-frequency-graph-pane").node().getBoundingClientRect().height;
  var padding = 50;

  d3.select("#note-frequency")
    .attr("width", width)
    .attr("height", height);

  var mapping = populateNoteFrequencyMap(trackSet);
  mapping.sort((a, b) => b.count - a.count);

  var xScale = d3.scaleBand()
    .domain(mapping.map(function(d) {
      return d.note;
    }))
    .range([padding, width - padding * 2])
    .padding(.1);

  var yScale = d3.scaleLinear()
    .domain([0, d3.max(mapping, function(d) {
      return d.count;
    })])
    .range([height - padding, padding]);

  svg.append("g")
    .attr("transform", "translate(0," + (height - padding) + ")")
    .call(d3.axisBottom(xScale))
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .attr("transform", "rotate(-35)");

  svg.append("g")
    .attr("transform", "translate(" + padding + ", 0)")
    .call(d3.axisLeft(yScale));

  svg.selectAll(".bar")
    .data(mapping)
    .enter().append("rect")
    .attr("class", "bar")
    .attr("fill", "#dc3912")
    .attr("x", function(d) {
      return xScale(d.note);
    })
    .attr("y", function(d) {
      return yScale(d.count);
    })
    .attr("width", xScale.bandwidth())
    .attr("height", function(d) {
      return height - yScale(d.count) - padding;
    });

  drawTitle(svg, width, height, padding, "Note Histogram");
}

/**
 * A helpful method for building the file list menu.
 */
function buildFileList(files) {
  file_list = document.getElementById("input-file-list");
  for (var i = 0; i < files.length; i++) {
    var node = document.createElement("div");
    node.className = "file-list-item";
    node.innerHTML += files[0].name;
    file_list.appendChild(node);
  }
}

/**
 * The midi load callback function. Loads the midi file, logs it,
 * and plots it on a histogram.
 *
 * @param {Object} obj - a parsed midi file as JSON
 */
function midiLoadCallback(obj) {
  noteHistogram(obj.track);
}

/**
 * Populates a mapping based on note frequency.
 *
 * @param {Object} track - the track array
 */
function populateNoteFrequencyMap(track) {
  var mapping = []
  track.forEach(function(midiEvent) {
    midiEvent.event.forEach(function(d) {
      if (d.type == 9) {
        var found = false;
        for (var i = 0; i < mapping.length && !found; i++) {
          if (mapping[i].note == d.data[0]) {
            mapping[i].count += 1;
            found = true;
          }
        }
        if (!found) {
          mapping.push({
            "note": d.data[0],
            "count": 1
          })
        }
      }
    });
  });
  return mapping;
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

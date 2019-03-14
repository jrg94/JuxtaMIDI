function setup() {
  var source = document.getElementById('input');
  MIDIParser.parse(source, midiLoadCallback);
}

function noteHistogram(track) {
  var svg = d3.select("#note-frequency");

  var width = d3.select(".note-frequency-graph-pane").node().getBoundingClientRect().width;
  var height = d3.select(".note-frequency-graph-pane").node().getBoundingClientRect().height;
  var padding = 50;

  d3.select("#note-frequency")
    .attr("width", width)
    .attr("height", height);

  var mapping = populateNoteFrequencyMap(track);
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
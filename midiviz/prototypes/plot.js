var source = document.getElementById('input');
var midiFile = MIDIParser.parse(source, midiLoadCallback);

var width = 800;
var height = 800;
var padding = 50;

d3.select("body").append("svg")
  .attr("width", width)
  .attr("height", height);

var svg = d3.select("svg");

function midiLoadCallback(obj) {
  console.log(obj);
  genreHistogram(obj.track);
}

function populateMap(track) {
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
                mapping.push({"note": d.data[0], "count": 1})
            }
          }
      });
  });
  return mapping;
}

function genreHistogram(track) {
    var mapping = populateMap(track);
    mapping.sort((a, b) => b.count - a.count);
    console.log(mapping);

    var xScale = d3.scaleBand()
        .domain(mapping.map(function(d) { return d.note; }))
        .range([padding, width - padding * 2])
        .padding(.1);

    var yScale = d3.scaleLinear()
        .domain([0, d3.max(mapping, function (d) { return d.count; })])
        .range([height - padding, padding]);

    svg.append("g")
	    .attr("transform", "translate(0," + (height - padding) + ")")
	    .call(d3.axisBottom(xScale))
	    .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-35)");

	// Draw y-axis
    svg.append("g")
    	.attr("transform", "translate(" + padding + ", 0)")
        .call(d3.axisLeft(yScale));

    svg.selectAll(".bar")
        .data(mapping)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("fill", "#dc3912")
        .attr("x", function (d) {
            return xScale(d.note);
        })
        .attr("y", function (d) {
            return yScale(d.count);
        })
        .attr("width", xScale.bandwidth())
        .attr("height", function (d) {
            return height - yScale(d.count) - padding;
        });

    drawTitle("Note Histogram");
}

/**
 * Draws a title on the master SVG
 *
 * @param {string} title - the title to be drawn
 */
function drawTitle(title) {
    svg.append("text")
	    .attr("class", "title")
	    .attr("dy", padding / 2)
	    .attr("dx", ((width/2) - padding / 2))
	    .style("text-anchor", "middle")
	    .style("font-size", "20px")
        .style("text-decoration", "underline")
	    .text(title)
}

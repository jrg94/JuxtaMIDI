/**
 * Useful, widely used constants & enums
 */
class Constants {
  /**
   * Mapping of MIDI key numbers to key names.
   */
  static NOTE_MAPPING = [
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
   * Visualization color scheme.
   */
  static VIZ_COLORS = ["#a6cee3", "#1f78b4", "#b2df8a", "#33a02c", "#fb9a99", "#e31a1c",
                     "#fdbf6f", "#ff7f00", "#cab2d6", "#6a3d9a", "#ffff99", "#b15928"];
}

/**
 * Draws a title on a given d3 SVG object, positioning it based on its width, height, and padding.
 */
function drawTitle(svg, width, height, padding, title) {
  svg.append("text")
    .attr("class", "title")
    .attr("dy", padding / 2)
    .attr("dx", ((width / 2) - padding / 2))
    .style("text-anchor", "middle")
    .style("font-size", "18px")
    .text(title)
    .classed("axes-labels", true);
}

/**
 * Draws the x-axis.
 *
 * @param xScale - a D3 scale object
 * @param padding - the padding
 * @param height - the height of the SVG
 * @param width - the width of the SVG
 * @param label - the x-axis label
 */
function drawXAxis(svg, xScale, padding, height, width, label, rotated=false) {

  if (rotated) {
    svg.append("g")
      .attr("transform", "translate(0," + (height - padding) + ")")
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .attr("y", 0)
      .attr("x", 9)
      .attr("dy", ".35em")
      .attr("transform", "rotate(90)")
      .style("text-anchor", "start");
  } else {
    svg.append("g")
      .attr("transform", "translate(0," + (height - padding) + ")")
      .call(d3.axisBottom(xScale))
  }

  // Draw x-axis title
  svg.append("text")
    .attr("transform", "translate(" + ((width / 2) - padding / 2) + " ," + (height - 5) + ")")
    .style("text-anchor", "middle")
    .text(label)
    .classed("axes-labels", true);
}

/**
 * Draws the y-axis.
 *
 * @param yScale - a D3 scale object
 * @param padding - the padding
 * @param height - the height of the SVG
 * @param label - the y-axis label
 */
function drawYAxis(svg, yScale, padding, height, label) {
  // Draw y-axis
  svg.append("g")
    .attr("transform", "translate(" + padding + ", 0)")
    .call(d3.axisLeft(yScale));

  // Draw y-axis title
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - 5)
    .attr("x", 0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text(label)
    .classed("axes-labels", true);
}

/**
 * Grabs the dimensions of the SVG container
 */
function getPaneDimensions(graph) {
  var svg = d3.select(graph);
  var width = svg.node().parentNode.getBoundingClientRect().width;
  var height = svg.node().parentNode.getBoundingClientRect().height;
  return [width, height, 50];
}

/**
 * Sets the dimensions of the SVG
 */
function setGraphDimensions(graph, width, height, scalingFactor = 1) {
  var widthPercentage = 100 * scalingFactor;
  var svg = d3.select(graph)
    .attr("width", `${widthPercentage}%`)
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "none");
}

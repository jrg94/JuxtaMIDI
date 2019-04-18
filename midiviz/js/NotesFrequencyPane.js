class NotesFrequencyPane {
  constructor(dashboard) {
    this.dashboard = dashboard;
  }

  /**
   * Creates the note frequency graph.
   */
  graph() {
    var svg = d3.select("#note-frequency");

    var width, height, padding;
    [width, height, padding] = getPaneDimensions("#note-frequency");
    setGraphDimensions("#note-frequency", width, height);

    var keys = Object.keys(this.dashboard.midiFiles);
    var mapping = this.dashboard.mappings.frequency;
    mapping.sort((a, b) => b.count - a.count);

    var xNoteScale = d3.scaleBand()
      .domain(mapping.map(d => d.note))
      .range([padding, width - padding])
      .padding(.1);

    const trackNames = [...new Set(mapping.map(d => d.name))];
    var xTrackScale = d3.scaleBand()
      .domain(trackNames)
      .rangeRound([0, xNoteScale.bandwidth()])
      .padding(0.05);

    var yScale = d3.scaleLinear()
      .domain([0, d3.max(mapping, d => d.count)])
      .range([height - padding, padding]);

    drawXAxis(svg, xNoteScale, padding, height, width, "Notes", true);
    drawYAxis(svg, yScale, padding, height, "Frequency")
    drawTitle(svg, width, height, padding, "Note Frequency");

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
  }
}

class NotesFrequencyPane {
  constructor(dashboard) {
    this.dashboard = dashboard;
  }

  /**
   * Creates the note frequency graph.
   */
  graph() {
    var svg = d3.select("#note-frequency");

    var width = d3.select(".note-frequency-graph-pane").node().getBoundingClientRect().width;
    var height = d3.select(".note-frequency-graph-pane").node().getBoundingClientRect().height;
    var padding = 60;
    // TODO: Separate this padding into a map? top/bottom/left/right. It appears inconsistently centered now.

    d3.select("#note-frequency")
      .html("")
      .attr("width", width)
      .attr("height", height);

    var keys = Object.keys(this.dashboard.midiFiles);
    var mapping = this.dashboard.mappings.frequency;
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
}

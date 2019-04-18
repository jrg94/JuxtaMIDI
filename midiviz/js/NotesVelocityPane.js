class NotesVelocityPane {
  constructor(dashboard) {
    this.dashboard = dashboard;
  }

  /**
   * Graphs velocity over time graph.
   * TODO: Bug fix: when 2 bars are different due to one being 0 and another being >0, the opacity is 0.2 instead of 1.0.
   */
  graph() {
    var svg = d3.select("#velocity-over-time");

    var padding, width, height;
    [width, height, padding] = getPaneDimensions("#velocity-over-time");
    width *= 2;
    setGraphDimensions("#velocity-over-time", width, height, 2);

    var keys = Object.keys(this.dashboard.midiFiles);
    var timestamps = this.dashboard.mappings.velocity;

    var xTimeScale = d3.scaleLinear()
      .domain([0, d3.max(timestamps, d => d.time)])
      .range([padding, width - padding]);

    var yVelocityScale = d3.scaleLinear()
      .domain([d3.min(timestamps, d => d.loVelocity - 15), d3.max(timestamps, d => d.hiVelocity + 15)])
      .range([height - padding, padding]);

    drawXAxis(svg, xTimeScale, padding, height, width / 2, "Time (index)");
    drawYAxis(svg, yVelocityScale, padding, height, "Velocity")

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

    for (var velocity of ["loVelocity", "hiVelocity"]) {
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
}

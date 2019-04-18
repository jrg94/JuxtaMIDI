class NotesPlayedPane {
  constructor(dashboard) {
    this.dashboard = dashboard;
  }

  /**
   * Graphs master note graph, showing progression of notes played over time.
   */
  graph() {
    d3.select(".welcome-message").remove();

    var svg = d3.select("#notes-over-time");
    svg.style("display", "inline");

    var keys = Object.keys(this.dashboard.midiFiles);

    // TODO: Adjust width here based on parameters? (# of notes, length of song, screen size)?
    // Adjust title formula accordingly. Currently at * 2 for both
    var padding = svg.attr("padding");
    var width = d3.select(".master-graph-pane").node().getBoundingClientRect().width * 2;
    var height = d3.select(".master-graph-pane").node().getBoundingClientRect().height;

    d3.select("#notes-over-time")
      .html("")
      .attr("width", width)
      .attr("height", height);

    let mapping = this.dashboard.mappings.notes;

    var xTimeScale = d3.scaleLinear()
      .domain([0, d3.max(mapping, d => d.time + d.duration)])
      .range([padding, width - padding * 2]);

    var yNoteScale = d3.scaleBand()
      .domain(mapping.map(d => d.note))
      .range([height - padding, padding])
      .padding(.1);

    const trackNames = [...new Set(mapping.map(d => d.name))];
    var yTrackScale = d3.scaleBand()
      .domain(trackNames)
      .rangeRound([0, yNoteScale.bandwidth()])
      .padding(0.05);

    drawXAxis(svg, xTimeScale, padding, height, width / 2, "Time (index)");
    drawYAxis(svg, yNoteScale, padding, height, "Notes")

    drawTitle(svg, width / 2, height, padding, "Notes Played");

    svg.append("g")
      .selectAll("g")
      .data(mapping)
      .join("g")
      .attr("transform", d => `translate(0,${yNoteScale(d.note)})`)
      .selectAll("rect")
      .data(d => keys.map(key => {
        return d
      }))
      .join("rect")
      .attr("class", "bar tipped")
      .attr("x", d => xTimeScale(d.time))
      .attr("y", d => yTrackScale(d.name))
      .attr("data-tippy-content", (d) => `${d.name}<br>note: ${d.note}<br>start: ${d.time}<br>velocity: ${d.velocity}<br>duration: ${d.duration}`)
      .attr("width", d => xTimeScale(d.duration) - padding)
      .attr("height", yTrackScale.bandwidth())
      //.attr("stroke", "black") // TODO: Might want stroke here for distinguishing overlap? Not sure.
      .attr("fill", d => d.color);
  }
}

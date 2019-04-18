class GraphViewPane {
  constructor(dashboard) {
    this.dashboard = dashboard;
    this.setupViewButtons();
  }

  setupViewButtons() {
    let pane = this;
    d3.select("#view-all").on("click", function() {
      pane.switchToPane(Views.ALL);
    });
    d3.select("#view-notes").on("click", function() {
      pane.switchToPane(Views.NOTES);
    });
    d3.select("#view-frequency").on("click", function() {
      pane.switchToPane(Views.FREQUENCY);
    });
    d3.select("#view-velocity").on("click", function() {
      pane.switchToPane(Views.VELOCITY);
    });
  }

  enablePanes() {
    d3.selectAll(".graph-view-buttons span").classed("disabled-view-button", false);
  }

  disablePanes() {
    d3.selectAll(".graph-view-buttons span").classed("disabled-view-button", true);
  }

  /**
   * Switches to desired pane, using Views constant. Activates buttons, making them visible if disabled to start.
   */
  switchToPane(pane) {
    d3.selectAll(".graph-view-buttons span").classed("disabled-view-button", false);
    d3.selectAll(".graph-view-buttons span").classed("selected-view-button", false);
    this.dashboard.clearSvgs();
    if (pane == Views.ALL) {
      d3.select("#view-all").classed("selected-view-button", true);
      d3.selectAll(".graph-pane").classed("selected-view", false);
      d3.selectAll(".graph-pane").classed("graph-disabled", false);
      d3.selectAll(".graph-pane").classed("single-graph-activated", false);
      this.dashboard.panes.notesPlayed.graph();
      this.dashboard.panes.notesFrequency.graph();
      this.dashboard.panes.notesVelocity.graph();
    } else {
      d3.selectAll(".graph-pane").classed("graph-disabled", true);
      d3.select(pane).classed("graph-disabled", false);
      d3.select(pane).classed("selected-view", true);
      switch(pane) {
        case Views.NOTES:
          d3.select("#view-notes").classed("selected-view-button", true);
          this.dashboard.panes.notesPlayed.graph();
          break;
        case Views.FREQUENCY:
          d3.select("#view-frequency").classed("selected-view-button", true);
          this.dashboard.panes.notesFrequency.graph();
          break;
        case Views.VELOCITY:
          d3.select("#view-velocity").classed("selected-view-button", true);
          this.dashboard.panes.notesVelocity.graph();
          break;
        default:
      }
    }
    dashboard.applyTooltips();
  }
}

/**
 * Constant class to represent view choices.
 */
class Views {
  static ALL = 0;
  static NOTES = ".master-graph-pane";
  static FREQUENCY = ".note-frequency-graph-pane";
  static VELOCITY = ".velocity-over-time-graph-pane";
}

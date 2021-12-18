import { STATE_NOT_RUNNING } from 'home-assistant-js-websocket';
import { LitElement, css, html } from 'lit-element';

import Chart from 'chart.js/auto';

class OccupancyCard extends LitElement {
  static get properties() {
    return {
      hass: {},
      config: {},
    };
  }

  render() {
    if (!this.config || !this.hass) {
      return html``;
    }

    if (!this.hass.states[this.config.entity]) {
      return html`
        <hui-warning>
          ${this.hass.config.state !== STATE_NOT_RUNNING
            ? this.hass.localize(
                'ui.panel.lovelace.warning.entity_not_found',
                'entity',
                this.config.entity || '[empty]'
              )
            : this.hass.localize('ui.panel.lovelace.warning.starting')}
        </hui-warning>
      `;
    }

    return html`
      <ha-card>
        ${this.config.title
          ? html`
              <h1 class="card-header">
                <div class="name">${this.config.title}</div>
              </h1>
            `
          : ''}
        <div class="card-content">
          <canvas id="myChart"></canvas>
        </div>
      </ha-card>
    `;
  }

  async firstUpdated() {
    await new Promise((r) => setTimeout(r, 0));

    const element = this.root.getElementById('myChart');
    if (!element) {
      return;
    }

    const context = element.getContext('2d');
    if (!context) {
      return;
    }

    Chart.register({
      id: 'no-data-message',
      afterDraw(chart) {
        if (chart.data.datasets.length === 0) {
          const { ctx, width, height } = chart;
          chart.clear();
          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = "16px normal 'Helvetica Nueue'";
          ctx.fillText('No data to display', width / 2, height / 2);
          ctx.restore();
        }
      },
    });

    this.chart = new Chart(context, {
      type: 'bar',
      data: {
        datasets: [],
      },
      options: {
        plugins: {
          title: {
            display: false,
          },
          legend: {
            display: false,
          },
          tooltip: {
            enabled: false,
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              callback(value) {
                return new Date(
                  this.getLabelForValue(value)
                ).toLocaleTimeString('de-DE', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
              },
            },
          },
          y: {
            min: 0,
            max: 1,
            ticks: {
              callback(value) {
                return value.toLocaleString('de-DE', { style: 'percent' });
              },
            },
          },
        },
      },
    });
  }

  async updated() {
    await new Promise((r) => setTimeout(r, 0));

    if (!this.chart) {
      return;
    }

    let {
      attributes: { courses },
    } = this.hass.states[this.config.entity];
    courses = courses || [];

    let data;
    if (this.config.data === 'slots') {
      data = courses.map((course) => ({
        x: course.start,
        y: (course.booked / (course.booked + course.free)).toFixed(2),
      }));
    } else if (this.config.data === 'courses') {
      data = courses.map((course) => ({
        x: course.start,
        y: course.occupancy.toFixed(2),
      }));
    } else {
      return;
    }

    if (!Array.isArray(data) || !data.length) {
      this.chart.data.datasets = [];
    } else {
      this.chart.data.datasets = [
        {
          data,
          backgroundColor:
            this.config.backgroundColor || 'rgba(255, 205, 86, 0.6)',
          borderColor: this.config.borderColor || 'rgb(255, 205, 86)',
          borderRadius: 2,
          borderSkipped: 'start',
        },
      ];
    }

    this.chart.update('none');
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('You need to define an entity');
    }
    this.config = config;
  }

  getCardSize() {
    return Number.isInteger(this.config.size) ? this.config.size : 5;
  }

  get root() {
    return this.shadowRoot || this;
  }

  static get styles() {
    return css`
      ha-card {
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        overflow: hidden;
      }
      .card-header {
        display: flex;
        justify-content: space-between;
      }
      .card-header .name {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `;
  }
}

customElements.define('occupancy-card', OccupancyCard);

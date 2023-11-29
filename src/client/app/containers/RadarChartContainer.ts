/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import * as _ from 'lodash';
import * as moment from 'moment';
import { connect } from 'react-redux';
import getGraphColor from '../utils/getGraphColor';
import { State } from '../types/redux/state';
import translate from '../utils/translate';
import Plot from 'react-plotly.js';
import Locales from '../types/locales';
import { DataType } from '../types/Datasources';
import { lineUnitLabel } from '../utils/graphics';
import { AreaUnitType, getAreaUnitConversion } from '../utils/getAreaUnitConversion';

function mapStateToProps(state: State) {
	const timeInterval = state.graph.timeInterval;
	const unitID = state.graph.selectedUnit;
	const datasets: any[] = [];
	// The unit label depends on the unit which is in selectUnit state.
	const graphingUnit = state.graph.selectedUnit;
	// The current selected rate
	const currentSelectedRate = state.graph.lineGraphRate;
	let unitLabel = '';
	let needsRateScaling = false;
	// If graphingUnit is -99 then none selected and nothing to graph so label is empty.
	// This will probably happen when the page is first loaded.
	if (graphingUnit !== -99) {
		const selectUnitState = state.units.units[state.graph.selectedUnit];
		if (selectUnitState !== undefined) {
			// Determine the r-axis label and if the rate needs to be scaled.
			const returned = lineUnitLabel(selectUnitState, currentSelectedRate, state.graph.areaNormalization, state.graph.selectedAreaUnit);
			unitLabel = returned.unitLabel
			needsRateScaling = returned.needsRateScaling;
		}
	}
	// The rate will be 1 if it is per hour (since state readings are per hour) or no rate scaling so no change.
	const rateScaling = needsRateScaling ? currentSelectedRate.rate : 1;

	// Add all valid data from existing meters to the radar plot
	for (const meterID of state.graph.selectedMeters) {
		const byMeterID = state.readings.line.byMeterID[meterID];
		if (byMeterID !== undefined && byMeterID[timeInterval.toString()] !== undefined) {
			const meterArea = state.meters.byMeterID[meterID].area;
			// We either don't care about area, or we do in which case there needs to be a nonzero area.
			if (!state.graph.areaNormalization || (meterArea > 0 && state.meters.byMeterID[meterID].areaUnit != AreaUnitType.none)) {
				// Convert the meter area into the proper unit if normalizing by area or use 1 if not so won't change reading values.
				const areaScaling = state.graph.areaNormalization ?
					meterArea * getAreaUnitConversion(state.meters.byMeterID[meterID].areaUnit, state.graph.selectedAreaUnit) : 1;
				// Divide areaScaling into the rate so have complete scaling factor for readings.
				const scaling = rateScaling / areaScaling;
				const readingsData = byMeterID[timeInterval.toString()][unitID];
				if (readingsData !== undefined && !readingsData.isFetching) {
					const label = state.meters.byMeterID[meterID].identifier;
					const colorID = meterID;
					if (readingsData.readings === undefined) {
						throw new Error('Unacceptable condition: readingsData.readings is undefined.');
					}

					// Create two arrays for the x and y values. Fill the array with the data from the line readings
					const thetaData: string[] = [];
					const rData: number[] = [];
					const hoverText: string[] = [];
					const readings = _.values(readingsData.readings);
					// The scaling is the factor to change the reading by. It divides by the area while will be 1 if no scaling by area.
					readings.forEach(reading => {
						// As usual, we want to interpret the readings in UTC. We lose the timezone as this as the start/endTimestamp
						// are equivalent to Unix timestamp in milliseconds.
						const st = moment.utc(reading.startTimestamp);
						// Time reading is in the middle of the start and end timestamp
						const timeReading = st.add(moment.utc(reading.endTimestamp).diff(st) / 2);
						thetaData.push(timeReading.format('ddd, ll LTS'));
						const readingValue = reading.reading * scaling;
						rData.push(readingValue);
						hoverText.push(`<b> ${timeReading.format('ddd, ll LTS')} </b> <br> ${label}: ${readingValue.toPrecision(6)} ${unitLabel}`);
					});

					// This variable contains all the elements (x and y values, line type, etc.) assigned to the data parameter of the Plotly object
					datasets.push({
						name: label,
						theta: thetaData,
						r: rData,
						text: hoverText,
						hoverinfo: 'text',
						type: 'scatterpolar',
						mode: 'lines',
						line: {
							shape: 'spline',
							width: 2,
							color: getGraphColor(colorID, DataType.Meter)
						}
					});
				}
			}
		}
	}

	// TODO Add groups for radar chart.
	// Add all valid data from existing groups to the radar plot
	for (const groupID of state.graph.selectedGroups) {
		const byGroupID = state.readings.line.byGroupID[groupID];
		if (byGroupID !== undefined && byGroupID[timeInterval.toString()] !== undefined) {
			const groupArea = state.groups.byGroupID[groupID].area;
			// We either don't care about area, or we do in which case there needs to be a nonzero area.
			if (!state.graph.areaNormalization || (groupArea > 0 && state.groups.byGroupID[groupID].areaUnit != AreaUnitType.none)) {
				// Convert the group area into the proper unit if normalizing by area or use 1 if not so won't change reading values.
				const areaScaling = state.graph.areaNormalization ?
					groupArea * getAreaUnitConversion(state.groups.byGroupID[groupID].areaUnit, state.graph.selectedAreaUnit) : 1;
				// Divide areaScaling into the rate so have complete scaling factor for readings.
				const scaling = rateScaling / areaScaling;
				const readingsData = byGroupID[timeInterval.toString()][unitID];
				if (readingsData !== undefined && !readingsData.isFetching) {
					const label = state.groups.byGroupID[groupID].name;
					const colorID = groupID;
					if (readingsData.readings === undefined) {
						throw new Error('Unacceptable condition: readingsData.readings is undefined.');
					}

					// Create two arrays for the x and y values. Fill the array with the data from the line readings
					const thetaData: string[] = [];
					const rData: number[] = [];
					const hoverText: string[] = [];
					const readings = _.values(readingsData.readings);
					// The scaling is the factor to change the reading by. It divides by the area while will be 1 if no scaling by area.
					readings.forEach(reading => {
						// As usual, we want to interpret the readings in UTC. We lose the timezone as this as the start/endTimestamp
						// are equivalent to Unix timestamp in milliseconds.
						const st = moment.utc(reading.startTimestamp);
						// Time reading is in the middle of the start and end timestamp
						const timeReading = st.add(moment.utc(reading.endTimestamp).diff(st) / 2);
						thetaData.push(timeReading.format('ddd, ll LTS'));
						const readingValue = reading.reading * scaling;
						rData.push(readingValue);
						hoverText.push(`<b> ${timeReading.format('ddd, ll LTS')} </b> <br> ${label}: ${readingValue.toPrecision(6)} ${unitLabel}`);
					});

					// This variable contains all the elements (x and y values, line type, etc.) assigned to the data parameter of the Plotly object
					datasets.push({
						name: label,
						theta: thetaData,
						r: rData,
						text: hoverText,
						hoverinfo: 'text',
						type: 'scatterpolar',
						mode: 'lines',
						line: {
							shape: 'spline',
							width: 2,
							color: getGraphColor(colorID, DataType.Meter)
						}
					});
				}
			}
		}
	}

	let layout: any;
	// See if any meters/groups have readings
	let numReadings = 0;
	for (let i = 0; i < datasets.length; i++) {
		// In case the data is not yet available.
		if (datasets[i] && datasets[i].r) {
			numReadings += datasets[i].r.length;
		}
	}

	// TODO See 3D code for functions that can be used for this.
	if (datasets.length === 0) {
		// Customize the layout of the plot
		// See https://community.plotly.com/t/replacing-an-empty-graph-with-a-message/31497 for showing text not plot.
		// There are no meters so tell user.
		layout = {
			'xaxis': {
				'visible': false
			},
			'yaxis': {
				'visible': false
			},
			'annotations': [
				{
					'text': `${translate('select.meter.group')}`,
					'xref': 'paper',
					'yref': 'paper',
					'showarrow': false,
					'font': {
						'size': 28
					}
				}
			]
		}
	} else if (numReadings === 0) {
		// Customize the layout of the plot
		// See https://community.plotly.com/t/replacing-an-empty-graph-with-a-message/31497 for showing text not plot.
		// There is no data so tell user - likely due to date range outside where readings.
		// Remove plotting data even though none there is an empty r & theta that ives empty graphic.
		datasets.splice(0, datasets.length);
		layout = {
			'xaxis': {
				'visible': false
			},
			'yaxis': {
				'visible': false
			},
			'annotations': [
				{
					'text': `${translate('radar.no.data')}`,
					'xref': 'paper',
					'yref': 'paper',
					'showarrow': false,
					'font': {
						'size': 28
					}
				}
			]
		}
	} else {
		// Check if all the values for the dates are compatible. Plotly does not like having different dates in different
		// scatterpolar lines. Lots of attempts to get this to work failed so not going to allow since not that common.
		// First find the line with the most points. If same, use the first one found with that number of points.
		let maxLinePoints = Number.MIN_VALUE;
		let index = -1;
		for (let i = 0; i < datasets.length; i++) {
			if (datasets[i].theta.length > maxLinePoints) {
				maxLinePoints = datasets[i].theta.length;
				index = i;
			}
		}
		// Second, compare the dates (theta) for line with the max point to see if it has all the points in all other lines.
		let ok = true;
		for (let i = 0; i < datasets.length; i++) {
			// Don't compare to self
			if (i !== index) {
				// Current line to consider.
				const currentLine: string[] = datasets[i].theta;
				// See if all points in current line are in max length line. && means get false if any false.
				ok = ok && currentLine.every(v => datasets[index].theta.includes(v));
			}
		}
		if (!ok) {
			// Remove plotting data.
			datasets.splice(0, datasets.length);
			// The lines are not compatible so tell user.
			layout = {
				'xaxis': {
					'visible': false
				},
				'yaxis': {
					'visible': false
				},
				'annotations': [
					{
						'text': `${translate('radar.lines.incompatible')}`,
						'xref': 'paper',
						'yref': 'paper',
						'showarrow': false,
						'font': {
							'size': 28
						}
					}
				]
			}
		} else {
			// Data available and okay so plot.
			// Maximum number of ticks, represent 12 months. Too many is cluttered so this seems good value.
			// Plotly shows less if only a few points.
			const maxTicks = 12;
			layout = {
				autosize: true,
				showlegend: true,
				height: 800,
				legend: {
					x: 0,
					y: 1.1,
					orientation: 'h'
				},

				polar: {
					radialaxis: {
						title: unitLabel,
						showgrid: true,
						gridcolor: '#ddd'
					},
					angularaxis: {
						// TODO Attempts to format the dates to remove the time did not work with plotly
						// choosing the tick values which is desirable.
						direction: 'clockwise',
						showgrid: true,
						gridcolor: '#ddd',
						nticks: maxTicks
					}
				},
				margin: {
					t: 10,
					b: -20
				}
			};
		}
	}

	// Assign all the parameters required to create the Plotly object (data, layout, config) to the variable props, returned by mapStateToProps
	// The Plotly toolbar is displayed if displayModeBar is set to true
	const props: any = {
		data: datasets,
		layout,
		config: {
			displayModeBar: true,
			responsive: true,
			locales: Locales // makes locales available for use
		}
	};
	props.config.locale = state.options.selectedLanguage;
	return props;
}

export default connect(mapStateToProps)(Plot);

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import * as d3 from 'd3';
import ITooltipService = powerbi.extensibility.ITooltipService;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;

import { VisualFormattingSettingsModel } from "./settings";
interface DataItem {
    letter: string;
    frequency: number;
}


export class Visual implements IVisual {
    private target: HTMLElement;
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;
    private data: DataItem[];
    private tableData: any;
    private tooltipService: ITooltipService;
    constructor(options: VisualConstructorOptions) {
        console.log('Visual constructor', options);
        this.formattingSettingsService = new FormattingSettingsService();
        this.target = options.element;
        this.tooltipService = options.host.tooltipService;
    }

    public update(options: VisualUpdateOptions) {
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(VisualFormattingSettingsModel, options.dataViews);
        // this.data = [ 
        //     { letter: "A", frequency: 0.08167 },
        //     { letter: "B", frequency: 0.08167 },
        //     { letter: "C", frequency: 0.118167 },
        // ];
        this.tableData = options.dataViews[0].table;
        this.data = this.data = options.dataViews[0].table.rows.map((row): DataItem => {
            return {
                letter: row[1] as string,
                frequency: row[0] as number
            };
        });
       
        if (this.formattingSettings.dataOrderCard.sortOrder.value.value  === "Alphabetical") {
            this.data.sort((a, b) => a.letter.localeCompare(b.letter));
        } else if (this.formattingSettings.dataOrderCard.sortOrder.value.value  === "Frequency Desc") {
            this.data.sort((a, b) => b.frequency - a.frequency);
        } else if (this.formattingSettings.dataOrderCard.sortOrder.value.value  === "Frequency Asc") {
            this.data.sort((a, b) => a.frequency - b.frequency);
        }
        while (this.target.firstChild) {
            this.target.removeChild(this.target.firstChild);
        }
        this.chart();

    }
    private chart() {
        const width = 640;
        const height = 400;
        const marginTop = 20;
        const marginRight = 0;
        const marginBottom = 30;
        const marginLeft = 40;

        const x = d3.scaleBand()
            .domain(this.data.map(d => d.letter))
            .range([marginLeft, width - marginRight])
            .padding(0.1);

        const xAxis = d3.axisBottom(x).tickSizeOuter(0);

        const y = d3.scaleLinear()
            .domain([0, d3.max(this.data, d => d.frequency)]).nice()
            .range([height - marginBottom, marginTop]);

        const svg = d3.create("svg")
            .attr("viewBox", [0, 0, width, height])
            .attr("style", `max-width: ${width}px; height: auto; font: 10px sans-serif; overflow: visible;`);


        const bar = svg.append("g")
            .attr("fill", "steelblue")
            .selectAll("rect")
            .data(this.data)
            .join("rect")
            .style("mix-blend-mode", "multiply")
            .attr("x", d => x(d.letter))
            .attr("y", d => y(d.frequency))
            .attr("height", d => y(0) - y(d.frequency))
            .attr("width", x.bandwidth())
            .on("mousemove", (event, d) => {
                const tooltipData: VisualTooltipDataItem[] = [{
                    displayName: this.tableData.columns[1].displayName,
                    value: d.letter
                }, {
                    displayName: this.tableData.columns[0].displayName,
                    value: `${(d.frequency * 100).toFixed(2)}%`
                }];
                const rect = this.target.getBoundingClientRect();
                const relativeX = event.clientX - rect.left;
                const relativeY = event.clientY - rect.top;
                const coords: number[] = [relativeX, relativeY];
                this.tooltipService.show({
                    dataItems: tooltipData,
                    coordinates:coords,
                    isTouchEvent: false,
                    identities:this.tableData.identities
                });
                
                
            })
            .on("mouseout", () => { 
                this.tooltipService.hide({ immediately: true, isTouchEvent: false });
            });

        const gx = svg.append("g")
            .attr("transform", `translate(0,${height - marginBottom})`)
            .call(xAxis);

        const gy = svg.append("g")
            .attr("transform", `translate(${marginLeft},0)`)
            .call(d3.axisLeft(y).tickFormat((y) => (y as number * 100).toFixed()))
            .call(g => g.select(".domain").remove());

        this.target.appendChild(svg.node());
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }



    
}


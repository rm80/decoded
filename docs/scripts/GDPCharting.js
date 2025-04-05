function downloadAllContainers() {
    const containers = document.querySelectorAll(".chart-container");

    containers.forEach((container, index) => {
        setTimeout(() => {
            html2canvas(container, {
                scale: 2,
                backgroundColor: "#ffffff",
                useCORS: true,
                padding: 0,
                scrollX: 0,
                scrollY: 0
            }).then(canvas => {
                const cropped = cropCanvas(canvas);
                const link = document.createElement("a");
                const filename = container.id ? `${container.id}.png` : `chart-${index + 1}.png`;
                link.download = filename;
                link.href = canvas.toDataURL("image/png");
                link.click();
            });
        }, index * 1200); // Slight delay to avoid collisions
    });
}

function cropCanvas(canvas) {
    const ctx = canvas.getContext("2d");
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data, width, height } = imageData;

    let top = null, bottom = null, left = null, right = null;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const alpha = data[idx + 3];
            const isWhite = data[idx] > 240 && data[idx + 1] > 240 && data[idx + 2] > 240;

            if (alpha > 0 && !isWhite) {
                if (top === null) top = y;
                bottom = y;
                if (left === null || x < left) left = x;
                if (right === null || x > right) right = x;
            }
        }
    }

    if (top === null) return canvas; // fallback: no visible pixels found

    const croppedWidth = right - left + 1;
    const croppedHeight = bottom - top + 1;

    const croppedCanvas = document.createElement("canvas");
    croppedCanvas.width = croppedWidth;
    croppedCanvas.height = croppedHeight;

    const croppedCtx = croppedCanvas.getContext("2d");
    croppedCtx.drawImage(canvas, left, top, croppedWidth, croppedHeight, 0, 0, croppedWidth, croppedHeight);

    return croppedCanvas;
}

const GDPCharting = (function () {
    let dataset = null;

    async function loadData() {
        if (dataset) return dataset;
        const url = "https://raw.githubusercontent.com/rm80/decoded/refs/heads/main/data/statsnz/regional-gross-domestic-product-year-ended-march-2024.csv";
        const raw = await d3.csv(url);
        dataset = raw.map(d => ({
            year: +d.Period.split(".")[0],
            region: d.Series_title_2,
            group: d.Group?.trim().toLowerCase(),
            metric: d.Series_title_3?.trim().toLowerCase() || "",
            value: +d.Data_value
        })).filter(d => !isNaN(d.value));
        return dataset;
    }

    function filterData({ metric, group, regionList, startYear, endYear }) {
        const metricLower = metric.toLowerCase();
        return dataset.filter(d => {
            const groupName = d.group;
            const regionMatch = !regionList || regionList.includes(d.region);
            const yearMatch = d.year >= startYear && d.year <= endYear;

            const isGdp = metricLower === "gross domestic product" &&
                          groupName === "gross domestic product, by region and industry" &&
                          d.metric === "gross domestic product";

            const isPerCapita = metricLower === "gdp per capita" &&
                                groupName === "gross domestic product per person, by region" &&
                                d.metric === "";
            
            if (isGdp && d.region === "Auckland") {
                console.log({
                    region: d.region,
                    year: d.year,
                    group: d.group,
                    metric: d.metric,
                    isGdp,
                    isPerCapita,
                    regionMatch,
                    yearMatch,
                    included: regionMatch && yearMatch && (isGdp || isPerCapita)
                });
                
            }
            
                                                    
            if (isPerCapita && d.region === "Auckland") {
                console.log({
                    region: d.region,
                    year: d.year,
                    group: d.group,
                    metric: d.metric,
                    isGdp,
                    isPerCapita,
                    regionMatch,
                    yearMatch,
                    included: regionMatch && yearMatch && (isGdp || isPerCapita)
                });

                console.log(" check condition:", regionMatch && yearMatch && (isGdp || isPerCapita));
                
            }

            // if ((isGdp || isPerCapita) && d.year > endYear) {
            //     console.warn(`INVALID YEAR FILTER: ${d.region}, ${d.year}, expected <= ${endYear}`);
            // }
            
            return regionMatch && yearMatch && (isGdp || isPerCapita);
        });
    }

    async function renderBarChart({ containerId, regionList, metric = "Gross Domestic Product", year = 2024, sort = "gdp-desc", showLine = false, width = 900, height = 400 }) {
        const data = await loadData();
        const group = metric === "GDP per capita"
            ? "gross domestic product per person, by region"
            : "gross domestic product, by region and industry";

        const filtered = filterData({ metric, group, regionList, startYear: year, endYear: year });
        const latest = filtered.filter(d => d.year === year);

        const margin = { top: 50, right: 50, bottom: 100, left: 80 };
        const innerW = width - margin.left - margin.right;
        const innerH = height - margin.top - margin.bottom;

        const svg = d3.select(`#${containerId}`);
        svg.selectAll("*").remove();
        svg.attr("width", width).attr("height", height);

        const chart = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand()
            .domain(latest.map(d => d.region))
            .range([0, innerW])
            .padding(0.3);

        const y = d3.scaleLinear()
            .domain([0, d3.max(latest, d => d.value)])
            .nice()
            .range([innerH, 0]);

        const color = d3.scaleOrdinal(d3.schemeCategory10).domain(latest.map(d => d.region));

        chart.selectAll(".bar")
            .data(latest)
            .enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", d => x(d.region))
            .attr("y", d => y(d.value))
            .attr("width", x.bandwidth())
            .attr("height", d => innerH - y(d.value))
            .attr("fill", d => color(d.region));

        if (showLine) {
            const line = d3.line()
                .x(d => x(d.region) + x.bandwidth() / 2)
                .y(d => y(d.value));

            chart.append("path")
                .datum(latest)
                .attr("fill", "none")
                .attr("stroke", "red")
                .attr("stroke-width", 2)
                .attr("d", line);

            chart.selectAll(".dot")
                .data(latest)
                .enter()
                .append("circle")
                .attr("class", "dot")
                .attr("cx", d => x(d.region) + x.bandwidth() / 2)
                .attr("cy", d => y(d.value))
                .attr("r", 4)
                .attr("fill", "white")
                .attr("stroke", "red")
                .attr("stroke-width", 1.5);
        }

        chart.append("g")
            .attr("transform", `translate(0,${innerH})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");

        chart.append("g")
            .call(d3.axisLeft(y).ticks(10).tickFormat(d => `$${d.toLocaleString()}`));
    }

    async function renderSmallMultiples({
        containerId,
        metric = "Gross Domestic Product",
        startYear = 2000,
        endYear = 2024,
        width = 220,
        height = 120
    }) {

        const container = d3.select(`#${containerId}`);
        container.selectAll("*").remove();

        const group = metric === "GDP per capita"
            ? "gross domestic product per person, by region"
            : "gross domestic product, by region and industry";

        const data = await loadData();
        const filtered = filterData({ metric, group, startYear, endYear });
        
        console.log("GROUP: ", group);
        console.log("FILTERED for " + metric + ": ", filtered.map(d => ({
            region: d.region,
            year: d.year,
            value: d.value,
            metric: d.metric
        })));

        const grouped = d3.groups(filtered, d => d.region);
        const margin = { top: 20, right: 10, bottom: 20, left: 40 };

        grouped.forEach(([region, values]) => {
            const svg = container.append("svg")
                .attr("width", width)
                .attr("height", height)
                .style("background", "#f9f9f9")
                .style("border", "1px solid #ccc")
                .style("box-shadow", "0 1px 2px rgba(0,0,0,0.1)");

            const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

            const x = d3.scaleLinear()
                .domain(d3.extent(values, d => d.year))
                .range([0, width - margin.left - margin.right]);

            const y = d3.scaleLinear()
                .domain([0, d3.max(values, d => d.value)])
                .nice()
                .range([height - margin.top - margin.bottom, 0]);

            const line = d3.line()
                .x(d => x(d.year))
                .y(d => y(d.value));

            g.append("path")
                .datum(values.sort((a, b) => a.year - b.year))
                .attr("fill", "none")
                .attr("stroke", "#1976d2")
                .attr("stroke-width", 2)
                .attr("d", line);

            g.append("text")
                .attr("x", (width - margin.left - margin.right) / 2)
                .attr("y", -8)
                .attr("text-anchor", "middle")
                .attr("font-size", "12px")
                .text(region);
        });
    }

    return {
        loadData,
        filterData,
        renderBarChart,
        renderSmallMultiples
    };
})();

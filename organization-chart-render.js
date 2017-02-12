import styles from './style.css';
import OrganizationChart from "./OrganizationChart.js";

const d3 = require('d3');

const width = 600;
const height = 600;

const svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

const jsonOrganisation = require("./organisation.json");

function collapse(d) {
    if (d.children) {
        d.hiddenChildren = d.children;
        d.hiddenChildren.forEach(collapse);
        d.children = null;
    }
}

new OrganizationChart({ svg: svg, organizationJson: jsonOrganisation} );
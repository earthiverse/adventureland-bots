import { Table } from "console-table-printer"
import fs from "fs"
import path from "path"

import { mean, median, standardDeviation } from "simple-statistics"

const directoryPath = "../data/atlus"
const sorter = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" })

// Get stats
function readNumbersFromFile(filePath: string): number[] {
    const fileContents = fs.readFileSync(filePath, "utf-8")
    const numbers = fileContents.trim().split("\n").map(Number)
    return numbers
}

function calculateStatistics(numbers: number[]) {
    return {
        average: mean(numbers),
        median: median(numbers),
        numRolls: numbers.length,
        numMoreThan96_3: numbers.filter((num) => num > 96.3).length,
        numLessThan1_2: numbers.filter((num) => num < 1.2).length,
        numZero: numbers.filter((num) => num === 0).length,
        standardDeviation: standardDeviation(numbers)
    }
}

function compareFileDistributions(directoryPath: string) {
    const fileNames = fs.readdirSync(directoryPath)

    const fileStatistics = fileNames.map(fileName => {
        const filePath = path.join(directoryPath, fileName)
        return {
            fileName,
            statistics: calculateStatistics(readNumbersFromFile(filePath)),
        }
    })

    return fileStatistics
}

const fileStats = compareFileDistributions(directoryPath).sort((a, b) => sorter.compare(a.fileName, b.fileName))

// Print stats
const table = new Table({
    sort: (row1, row2) => { return row2.percentZero - row1.percentZero }
})
for (const fileStat of fileStats) {
    table.addRow({
        slot: fileStat.fileName,
        average: fileStat.statistics.average.toFixed(2),
        median: fileStat.statistics.median.toFixed(2),
        stdDev: fileStat.statistics.standardDeviation.toFixed(2),
        numRolls: fileStat.statistics.numRolls,
        numZero: fileStat.statistics.numZero,
        percentZero: ((fileStat.statistics.numZero / fileStat.statistics.numRolls) * 100).toFixed(2),
        // numMoreThan96_3: fileStat.statistics.numMoreThan96_3,
        // percentMoreThan96_3: ((fileStat.statistics.numMoreThan96_3 / fileStat.statistics.numRolls) * 100).toFixed(2),
        // numLessThan1_2: fileStat.statistics.numLessThan1_2,
        // percentLessThan1_2: ((fileStat.statistics.numLessThan1_2 / fileStat.statistics.numRolls) * 100).toFixed(2)
    })
}
table.printTable()
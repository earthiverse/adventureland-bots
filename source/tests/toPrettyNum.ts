import { Table } from "console-table-printer"
import { RowOptionsRaw } from "console-table-printer/dist/src/utils/table-helpers"

function round(n)
{
    return Math.round(n)
}

function floor_f2(num)
{
    return parseInt((num * 100) as unknown as string) / 100.0
}

function to_pretty_float(num: number)
{
    if (!num) return "0"
    let hnum = floor_f2(num).toFixed(2)
    const num2 = parseFloat(hnum)
    if (parseFloat(hnum) == parseFloat(num2.toFixed(1))) hnum = num2.toFixed(1)
    if (parseFloat(hnum) == parseFloat(parseInt(num2 as unknown as string) as unknown as string)) hnum = parseInt(num2 as unknown as string) as unknown as string
    return hnum
}

function pretty_float_alt(num) {
    return (Math.trunc(num * 100) / 100).toString()
}

function pretty_float_alt2(num) {
    return (0 + Math.trunc(num * 100) / 100).toLocaleString()
}

function to_pretty_num(num)
{
    if (!num) return "0"
    num = round(num)
    let pretty: number | string = ""
    while (num)
    {
        let current: number | string = num % 1000
        if (!current) current = "000"
        else if (current < 10 && current != num) current = "00" + current
        else if (current < 100 && current != num) current = "0" + current
        if (!pretty) pretty = current
        else pretty = current + "," + pretty
        num = (num - num % 1000) / 1000
    }
    return "" + pretty
}

function pretty_num_alt(num) {
    // NOTE: The +0 is to handle signed zeros (-0)
    return (Math.round(num) + 0).toLocaleString()
}

const info = new Table()
for (const test of [-1234567.8910, -1234567, -123456, -12345, -1111, -111, -19.987654321, -19.123456789, -11.111, -11.11, -11.1, -11, -1, -0.1, -0.001, 0, 0.001, 0.1, 1, 11, 11.1, 11.11, 11.111, 19.123456789, 19.987654321, 111, 1111, 12345, 123456, 1234567, 1234567.8910]) {
    info.addRow({ input: test, to_pretty_float: to_pretty_float(test), pretty_float_alt: pretty_float_alt(test), pretty_float_alt2: pretty_float_alt2(test) })
}
info.printTable()
const door = G.maps.main.doors[2]
//show_json(door)
const x = door[0]
const y = door[1]
const width = door[2]
const height = door[3]
clear_drawings()
draw_circle(x, y, 5)
draw_line(x - width / 2, y, x + width / 2, y, 3, 0xFFFFFF)
draw_line(x - width / 2, y - height, x + width / 2, y - height, 3, 0xFFFFFF)
draw_line(x - width / 2, y - height, x - width / 2, y, 3, 0xFFFFFF)
draw_line(x + width / 2, y - height / 2, x + width / 2, y, 3, 0xFFFFFF)

//draw_circle(character.x, character.y, 5)
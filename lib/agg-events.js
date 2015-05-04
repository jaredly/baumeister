
export default function aggEvents(events, agg, endLast, errored) {
  if (!agg) agg = {
    sections: [],
    streams: {}
  }
  let section = agg.sections[agg.sections.length - 1]
  if (!section && events[0].evt !== 'section') {
    agg.sections.push(section = {name: events[0].section, items: [], start: events[0].time || Date.now()})
    // console.log("Can't have events without a section..", events[0], agg)
    // throw new Error("Invalid events list")
  }
  events.forEach(ev => {
    switch (ev.evt) {
      case 'section':
        if (section) {
          section.end = ev.time
          section.duration = section.end - section.start
        }
        agg.sections.push(section = {name: ev.val, items: [], start: ev.time})
        break
      case 'stream-start':
        agg.streams[ev.val.id] = {
          start: ev.val,
          items: [],
          end: null,
        }
        section.items.push(ev)
        break
      case 'stream-end':
        agg.streams[ev.val.id].end = ev.val
        break
      case 'stream':
        if (!agg.streams[ev.val.id]) {
          console.error(ev.val)
          console.error(agg)
          console.error(events)
          throw new Error('fail')
        }
        agg.streams[ev.val.id].items.push(ev.val)
        break
      default:
        section.items.push(ev)
    }
  })
  if (endLast) {
    section.end = Date.now()
    section.duration = section.end - section.start
    if (errored) {
      section.errored = true
    }
  }
  return agg
}


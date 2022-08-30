import icons from '../config/Icons.js'
import ids from '../config/ComponentIds.js'

export default {
  entries: 15,
  cpsOnFirstPage: 10,
  icon: icons.chartDedi,
  title: "Dedi Checkpoints",
  selfColour: "0F0F",
  cpColours: {
    best: "0F0F",
    worst: "F00F",
    equal: "FF0F"
  },
  navbar: [
    { name: 'Dedi Sectors', actionId: ids.dediSectors },
    { name: 'Local Checkpoints', actionId: ids.localCps },
    { name: 'Local Sectors', actionId: ids.localSectors },
    { name: 'Live Checkpoints', actionId: ids.liveCps },
    { name: 'Live Sectors', actionId: ids.liveSectors }
  ],
  cpPaginatorMargin: 0.25,
  startCellWidth: 2,
  indexCellWidth: 1,
  grid: {
    background: "9996",
    margin: 0.15,
    headerBackground: "333C"
  }
}
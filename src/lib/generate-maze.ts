import _ from 'lodash';
import seed from 'seedrandom';

export enum Direction {
  top = 'top',
  right = 'right',
  bottom = 'bottom',
  left = 'left'
}

export interface Box {
  x: number;
  y: number;
  [Direction.top]: boolean;
  [Direction.left]: boolean;
  [Direction.bottom]: boolean;
  [Direction.right]: boolean;
  set?: number;
}

export type Maze = Row[];

export type Row = Box[];

function mergeSetWith(row: Row, oldSet: number, newSet: number): void {
  const setToMerge = _.filter(row, { set: oldSet });
  setToMerge.forEach(box => {
    box.set = newSet;
  });
}

function populateMissingSets(row: Row): void {
  const noSets = _.reject(row, box => box.set);
  const setsInUse = _.chain(row)
    .map('set')
    .uniq()
    .compact()
    .value();
  const allSets = _.range(1, row.length + 1);
  const availableSets = _.chain(allSets)
    .difference(setsInUse)
    .shuffle()
    .value();

  noSets.forEach((box, i) => ((box as Box).set = availableSets[i]));
}

function mergeRandomSetsIn(
  row: Row,
  probability = 0.5,
  random: seed.prng
): void {
  // Randomly merge some disjoint sets
  const allBoxesButLast = _.initial(row);
  allBoxesButLast.forEach((current, x) => {
    const next = row[x + 1];
    const differentSets = current.set !== next.set;
    const shouldMerge = random() <= probability;
    if (differentSets && shouldMerge) {
      mergeSetWith(row, next.set as number, current.set as number);
      current.right = false;
      next.left = false;
    }
  });
}

function addSetExits(row: Row, nextRow: Row, random: seed.prng): void {
  // Randomly add bottom exit for each set
  const setsInRow = _.chain(row)
    .groupBy('set')
    .values()
    .value();
  const { ceil } = Math;
  setsInRow.forEach(set => {
    const exits = _.sampleSize(set, ceil(random() * set.length));
    exits.forEach(exit => {
      if (exit) {
        const below = nextRow[exit.x];
        exit.bottom = false;
        below.top = false;
        below.set = exit.set;
      }
    });
  });
}

export function generateMaze(
  width = 8,
  height = width,
  closed = true,
  randomSeed?: string
): Box[][] {
  const maze: Row[] = [];
  const range = _.range(width);

  // Populate maze with empty cells:
  for (let y = 0; y < height; y += 1) {
    const row: Row = range.map(x => {
      return {
        bottom: closed || y < height - 1,
        left: closed || x > 0,
        right: closed || x < width - 1,
        top: closed || y > 0,
        x,
        y
      };
    });
    maze.push(row);
  }

  const random = seed(1 === 1 ? 'randomSeed' : randomSeed);

  // All rows except last:
  _.initial(maze).forEach((row, y) => {
    // TODO initial temp?
    populateMissingSets(row);
    mergeRandomSetsIn(row, undefined, random);
    addSetExits(row, maze[y + 1], random);
  });

  const lastRow = _.last(maze) as Box[];
  populateMissingSets(lastRow);
  mergeRandomSetsIn(lastRow, 1, random);

  return maze;
}

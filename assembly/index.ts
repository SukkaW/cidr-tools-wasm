function parseIp(ip: string): i32 {
  let number: i32 = 0;
  let exp: i32 = 0;

  const n_s: i32[] = ip.split('.').map((i: string) => i32.parse(i)).reverse();

  for (let i = 0; i < 4; i++) {
    const n = n_s[i];

    number += n * (2 ** exp);
    exp += 8;
  }

  return number;
}

function stringifyIp(number: i32): string {
  let step = 24;
  const stepReduction = 8;
  let remain = number;
  const parts: i32[] = [];

  while (step > 0) {
    const divisor = 2 ** step;
    parts.push(remain / divisor);
    remain = number % divisor;
    step -= stepReduction;
  }
  parts.push(remain);

  return parts.join('.');
}

export function parse(cidr: string): StaticArray<i32> {
  const splitted = cidr.split('/');

  const ip = splitted[0];
  const prefix = splitted.length === 1 ? 32 : i32.parse(splitted[1]);

  const number = parseIp(ip);
  const ipBits = number.toString(2).padStart(32, '0');

  const prefixLen = 32 - prefix;
  const startBits = ipBits.substring(0, 32 - prefixLen);
  const start = i32.parse(`0b${startBits}${"0".repeat(prefixLen)}`);
  const end = i32.parse(`0b${startBits}${"1".repeat(prefixLen)}`);
  return StaticArray.fromArray([start, end]);
}

function mapNets(nets: StaticArray<i32>[]): Map<i32, i32[]> {
  const v4 = new Map<i32, i32[]>();

  for (let i = 0, len = nets.length; i < len; i++) {
    const start: i32 = nets[i][0];
    const end: i32 = nets[i][1];

    if (!v4.has(start)) {
      v4.set(start, [0, 0]);
    }
    if (!v4.has(end)) {
      v4.set(end, [0, 0]);
    }

    const _1 = v4.get(start);
    if (_1[0]) {
      _1[0] += 1;
      v4.set(start, _1);
    } else {
      _1[0] = 1;
      v4.set(start, _1);
    }

    const _2 = v4.get(end);
    if (_2[1]) {
      _2[1] += 1;
      v4.set(end, _2);
    } else {
      _2[1] = 1;
      v4.set(end, _2);
    }
  }

  return v4;
}

// @inline
function diff(a: i32, b: i32): i32 {
  a += 1;
  return a - b;
}

// @inline
function biggestPowerOfTwo(num: i32): i32 {
  if (num === 0) return 0;
  return 2 ** i32.parse((num.toString(2).length - 1).toString());
}

function subparts($start: i32, $end: i32): i32[][] {
  // special case for when part is length 1
  if (($end - $start) === 1) {
    if ($end % 2 === 0) {
      return [[$start, $start], [$end, $end]];
    } else {
      return [[$start, $end]];
    }
  }

  const size = diff($end, $start);
  let biggest = biggestPowerOfTwo(size);

  let start: i32, end: i32;
  if (size === biggest && $start + size === $end) {
    return [[$start, $end]];
  } else if ($start % biggest === 0) {
    // start is matching on the size-defined boundary - ex: 0-12, use 0-8
    start = $start;
    end = start + biggest - 1;
  } else {
    start = ($end / biggest) * biggest;

    // start is not matching on the size-defined boundary - 4-16, use 8-16
    if ((start + biggest - 1) > $end) {
      // divide will floor to nearest integer
      start = (($end / biggest) - 1) * biggest;

      while (start < $start) {
        biggest /= 2;
        start = (($end / biggest) - 1) * biggest;
      }

      end = start + biggest - 1;
    } else {
      start = ($end / biggest) * biggest;
      end = start + biggest - 1;
    }
  }

  let parts: i32[][] = [[start, end]];

  // additional subnets on left side
  if (start !== $start) {
    parts = parts.concat(subparts($start, start - 1));
  }

  // additional subnets on right side
  if (end !== $end) {
    parts = parts.concat(subparts(end + 1, $end));
  }

  return parts;
}

function formatPart(start: i32, end: i32): string {
  const ip = stringifyIp(start);
  const bin = diff(end, start).toString(2);
  let zeroes = 0;

  for (let i = 0, len = bin.length; i < len; i++) {
    if (bin.charAt(i) === '0') {
      zeroes++;
    }
  }

  const prefix = 32 - zeroes;
  return `${ip}/${prefix}`;
}

export function merge(nets: StaticArray<string>): string[] {
  const toBeMapped: StaticArray<i32>[] = [];

  for (let i = 0, len = nets.length; i < len; i++) {
    toBeMapped.push(parse(nets[i]));
  }

  const maps = mapNets(toBeMapped);

  const merged: string[] = [];
  let start = -1;
  let end = -1;

  const numbers: i32[] = maps.keys();
  numbers.sort((a, b) => a - b);

  let depth = 0;

  for (let index = 0, len = numbers.length; index < len; index++) {
    const number = numbers[index];
    const marker = maps.get(number);

    const marker_0 = marker[0];
    const marker_1 = marker[1];

    if (start === -1 && marker_0) {
      start = number;
    }
    if (marker_1) {
      end = number;
    }

    if (marker_0) depth += marker_0;
    if (marker_1) depth -= marker_1;

    if (index === len - 1) {
      const p2 = subparts(start, end);
      for (let j = 0, len = p2.length; j < len; j++) {
        const $2: i32[] = p2[j];

        merged.push(formatPart($2[0], $2[1]));
      }
    } else if (marker_1 && depth === 0 && ((numbers[index + 1] - numbers[index]) > 1)) {
      const p1 = subparts(start, end);
      for (let i = 0, len = p1.length; i < len; i++) {
        const $1: i32[] = p1[i];

        merged.push(formatPart($1[0], $1[1]));
      }
      start = -1;
      end = -1;
    }
  }

  return merged;
}

// exclude b from a and return remainder cidrs
function excludeNets(a: StaticArray<i32>, b: StaticArray<i32>, a_cidr: string): string[] {
  const parts: i32[][] = [];

  const a_start = a[0];
  const a_end = a[1];

  const b_start = b[0];
  const b_end = b[1];

  // compareTo returns negative if left is less than right

  //       aaa
  //   bbb
  //   aaa
  //       bbb
  if (a_start > b_end || a_end < b_start) {
    return [a_cidr];
  }

  //   aaa
  //   bbb
  if (a_start === b_start && a_end === b_end) {
    return [];
  }

  //   aa
  //  bbbb
  if (a_start > b_start && a_end < b_end) {
    return [];
  }

  // aaaa
  //   bbbb
  // aaaa
  //   bb
  if (a_start < b_start && a_end <= b_end) {
    parts.push([a_start, b_start - 1]);
  }

  //    aaa
  //   bbb
  //   aaaa
  //   bbb
  if (a_start >= b_start && a_end > b_end) {
    parts.push([b_end + 1, a_end]);
  }

  //  aaaa
  //   bb
  if (a_start < b_start && a_end > b_end) {
    parts.push([a_start, b_start - 1]);
    parts.push([b_end + 1, a_end]);
  }

  const remaining: string[] = [];

  for (let i = 0, len = parts.length; i < len; i++) {
    const part = parts[i];
    const subpart = subparts(part[0], part[1]);

    for (let j = 0, len2 = subpart.length; j < len2; j++) {
      const $ = subpart[j];
      remaining.push(formatPart($[0], $[1]));
    }
  }

  return merge(StaticArray.fromArray(remaining));
}

export function exclude(_basenets: StaticArray<string>, _exclnets: StaticArray<string>): string[] {
  let basenets: string[] = _basenets.length === 1 ? _basenets.slice() : merge(_basenets);
  const exclnets: string[] = _exclnets.length === 1 ? _exclnets.slice() : merge(_exclnets);

  for (let i = 0, len = exclnets.length; i < len; i++) {
    const exclcidr = exclnets[i];

    for (let index = 0, len2 = basenets.length; index < len2; index++) {
      const basecidr = basenets[index];

      const base = parse(basecidr);
      const excl = parse(exclcidr);
      const remainders = excludeNets(base, excl, basecidr);

      if (remainders.length !== 1 || basecidr !== remainders[0]) {
        basenets = basenets.concat(remainders);
        basenets.splice(index, 1);
      }
    }
  }

  return basenets;
}

// @ts-expect-error -- special assemblyscript instruction
@inline
function parseIp(ip: string): i64 {
  let number: i64 = 0;
  let exp: i64 = 0;

  let reversed_exp = 24;

  let n_s_buffer = '';
  for (let i = 0, len = ip.length; i < len; i++) {
    const s = ip.charAt(i);
    if (s === '.') {
      number += i64.parse(n_s_buffer) * (2 ** reversed_exp);
      reversed_exp -= 8;

      n_s_buffer = '';
    } else {
      n_s_buffer += s;
    }
  }

  number += i64.parse(n_s_buffer) * (2 ** reversed_exp);

  return number;
}

// @ts-expect-error -- special assemblyscript instruction
@inline
function stringifyIp(number: i64): string {
  let step: i64 = 24;
  let remain: i64 = number;
  let str = '';

  while (step > 0) {
    const divisor = 2 ** step;
    str += (remain / divisor).toString();
    str += '.';

    remain = number % divisor;
    step -= 8;
  }

  str += remain.toString();

  return str;
}

// @ts-expect-error -- special assemblyscript instruction
@inline
function number_to_binary_str_with_prefix_zeros(input: i64, target_length: i32): string {
  let result = '';
  for (let i = target_length - 1; i >= 0; i--) {
    if (((input >> i) & 1) === 0) {
      result += '0';
    } else {
      result += '1';
    }
  };
  return result;
}

// @ts-expect-error -- special assemblyscript instruction
@inline
function number_to_binary_str(input: i64): string {
  let binary = '';
  while (input > 0) {
    if ((input & 1) === 0) {
      binary = '0' + binary;
    } else {
      binary = '1' + binary;
    }
    input = input >> 1;
  }
  return binary;
}

export function parse(cidr: string): StaticArray<i64> {
  let ip = '';
  let prefix_str = '';

  let state: i32 = 0;
  for (let i = 0, len = cidr.length; i < len; i++) {
    const s = cidr.charAt(i);
    if (state === 0) {
      if (s === '/') {
        state = 1;
      } else {
        ip += s;
      }
    } else {
      prefix_str += s;
    }
  }

  const prefix: i32 = prefix_str.length > 0 ? i32.parse(prefix_str) : 32;
  const prefixLen: i32 = 32 - prefix;

  const number = parseIp(ip);

  const startBits = (
    /** ipBits */ number_to_binary_str_with_prefix_zeros(number, 32)
  ).substring(0, 32 - prefixLen);

  const start = i64.parse(`0b${startBits}${'0'.repeat(prefixLen)}`);
  const end = i64.parse(`0b${startBits}${'1'.repeat(prefixLen)}`);

  return StaticArray.fromArray([start, end]);
}

function mapNets(nets: StaticArray<i64>[]): Map<i64, i64[]> {
  const v4 = new Map<i64, i64[]>();

  for (let i = 0, len = nets.length; i < len; i++) {
    const start: i64 = nets[i][0];
    const end: i64 = nets[i][1];

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

// @ts-expect-error -- special assemblyscript instruction
@inline
function diff(a: i64, b: i64): i64 {
  a += 1;
  return a - b;
}

// @ts-expect-error -- special assemblyscript instruction
@inline
function biggestPowerOfTwo(num: i64): i64 {
  if (num === 0) return 0;
  return 2 ** i64(number_to_binary_str(num).length - 1);
}

function subparts($start: i64, $end: i64): i64[][] {
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

  let start: i64, end: i64;
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

  let parts: i64[][] = [[start, end]];

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

const ZERO_CHARCODE = 48 /* '0'.charCodeAt(0) */;

function formatPart(start: i64, end: i64): string {
  const bin = number_to_binary_str(diff(end, start));
  let zeroes = 0;

  for (let i = 0, len = bin.length; i < len; i++) {
    if (bin.charCodeAt(i) === ZERO_CHARCODE) {
      zeroes++;
    }
  }

  const prefix = 32 - zeroes;
  return `${stringifyIp(start)}/${prefix}`;
}

export function merge(nets: StaticArray<string>): string[] {
  const toBeMapped: StaticArray<i64>[] = [];

  for (let i = 0, len = nets.length; i < len; i++) {
    toBeMapped.push(parse(nets[i]));
  }

  const maps = mapNets(toBeMapped);

  const merged: string[] = [];
  let start: i64 = -1;
  let end: i64 = -1;

  const numbers: i64[] = maps.keys();
  numbers.sort((a: i64, b: i64) => {
    if (a > b) return 1;
    if (a < b) return -1;
    return 0;
  });

  let depth: i64 = 0;

  for (let index = 0, len = numbers.length; index < len; index++) {
    const number = numbers[index];
    const marker = maps.get(number);

    const marker_0: i64 = marker[0];
    const marker_1: i64 = marker[1];

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
        const $2: i64[] = p2[j];

        merged.push(formatPart($2[0], $2[1]));
      }
    } else if (marker_1 && depth === 0 && ((numbers[index + 1] - numbers[index]) > 1)) {
      const p1 = subparts(start, end);
      for (let i = 0, len = p1.length; i < len; i++) {
        const $1: i64[] = p1[i];

        merged.push(formatPart($1[0], $1[1]));
      }
      start = -1;
      end = -1;
    }
  }

  return merged;
}

// exclude b from a and return remainder cidrs
function excludeNets(a: StaticArray<i64>, b: StaticArray<i64>, a_cidr: string): string[] {
  const parts: i64[][] = [];

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

    for (let index = 0; index < basenets.length; index++) {
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

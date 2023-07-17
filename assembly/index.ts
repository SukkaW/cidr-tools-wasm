// @ts-expect-error -- special assemblyscript instruction
@inline
function ip_str_to_int(ip: string): i64 {
  let ip_part_index = 0

  let n_s_buffer = '';

  let ip_part_0 = '';
  let ip_part_1 = '';
  let ip_part_2 = '';
  let ip_part_3 = '';

  for (let i = 0, len = ip.length; i < len; i++) {
    const s = ip.charAt(i);
    if (s === '.') {
      switch (ip_part_index) {
        case 0:
          ip_part_0 = n_s_buffer;
          break;
        case 1:
          ip_part_1 = n_s_buffer;
          break;
        case 2:
          ip_part_2 = n_s_buffer;
          break;
        case 3:
          ip_part_3 = n_s_buffer;
          break;
      }

      ip_part_index += 1;

      n_s_buffer = '';
    } else {
      n_s_buffer += s;
    }
  }

  ip_part_3 = n_s_buffer;

  return (i64.parse(ip_part_0) << 24
    | i64.parse(ip_part_1) << 16
    | i64.parse(ip_part_2) << 8
    | i64.parse(ip_part_3));
}

// @ts-expect-error -- special assemblyscript instruction
@inline
function int_to_ip_str(number: i64): string {
  const part_0 = number >>> 24;
  const part_1 = (number >>> 16) & 0xff;
  const part_2 = (number >>> 8) & 0xff;
  const part_3 = number & 0xff;

  return `${part_0}.${part_1}.${part_2}.${part_3}`;
}

//// @ts-expect-error -- special assemblyscript instruction
// @inline
// function number_to_binary_str_with_prefix_zeros(input: i64, target_length: i32): string {
//   let result = '';
//   for (let i = target_length - 1; i >= 0; i--) {
//     if (((input >> i) & 1) === 0) {
//       result += '0';
//     } else {
//       result += '1';
//     }
//   };
//   return result;
// }

// // @ts-expect-error -- special assemblyscript instruction
// @inline
// function number_to_binary_str(input: i64): string {
//   let binary = '';
//   while (input > 0) {
//     if ((input & 1) === 0) {
//       binary = '0' + binary;
//     } else {
//       binary = '1' + binary;
//     }
//     input = input >> 1;
//   }
//   return binary;
// }

// @ts-expect-error -- special assemblyscript instruction
@inline
function number_to_binary_length(input: i64): i64 {
  let len: i64 = 0;

  while (input > 0) {
    len += 1;
    input = input >> 1;
  }

  return len;
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

  const bitmask: i64 = prefix_str.length > 0 ? i64.parse(prefix_str) : 32;
  let mask_long: i64 = 0;
  if (bitmask > 0) {
    mask_long = 0xffffffff << (32 - bitmask);
  }

  const net_long: i64 = ip_str_to_int(ip) & mask_long;
  const size: i64 = 2 ** (32 - bitmask);

  const start = net_long;
  const end = net_long + size - 1;

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
  return 2 ** i64(number_to_binary_length(num) - 1);
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

  if (size === biggest && $start + size === $end) {
    return [[$start, $end]];
  }

  let start: i64, end: i64;
  if ($start % biggest === 0) {
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

// const ZERO_CHARCODE = 48 /* '0'.charCodeAt(0) */;

function single_range_to_single_cidr(start: i64, end: i64): string {
  // const bin = number_to_binary_str(diff(end, start));
  // let zeroes = 0;

  // for (let i = 0, len = bin.length; i < len; i++) {
  //   if (bin.charCodeAt(i) === ZERO_CHARCODE) {
  //     zeroes++;
  //   }
  // }

  // const prefix = 32 - zeroes;
  // return `${int_to_ip_str(start)}/${prefix}`;

  let bits: i64 = 32;
  let reseau: i64 = start;
  while ((start & (1 << (32 - bits))) === 0 && (reseau | (1 << (32 - bits))) <= end) {
    reseau |= (1 << (32 - bits));
    bits -= 1;
  }
  return `${int_to_ip_str(start)}/${bits}`;
}

export function merge(nets: string[]): string[] {
  const toBeMapped: StaticArray<i64>[] = [];

  for (let i = 0, len = nets.length; i < len; i++) {
    toBeMapped.push(parse(nets[i]));
  }

  const maps = mapNets(toBeMapped);

  const merged: string[] = [];
  let start: i64 = -1;
  let end: i64 = -1;

  const numbers: i64[] = maps.keys().sort((a: i64, b: i64) => {
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

        merged.push(single_range_to_single_cidr($2[0], $2[1]));
      }
    } else if (marker_1 && depth === 0 && ((numbers[index + 1] - numbers[index]) > 1)) {
      const p1 = subparts(start, end);
      for (let i = 0, len = p1.length; i < len; i++) {
        const $1: i64[] = p1[i];

        merged.push(single_range_to_single_cidr($1[0], $1[1]));
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
      remaining.push(single_range_to_single_cidr($[0], $[1]));
    }
  }

  return merge(remaining);
}

export function exclude(_basenets: string[], _exclnets: string[]): string[] {
  let basenets: string[] = _basenets.length === 1 ? _basenets : merge(_basenets);
  const exclnets: string[] = _exclnets.length === 1 ? _exclnets : merge(_exclnets);

  for (let i = 0, len = exclnets.length; i < len; i++) {
    const exclcidr = exclnets[i];
    const excl = parse(exclcidr);

    for (let index = 0; index < basenets.length; index++) {
      const basecidr = basenets[index];
      const base = parse(basecidr);

      const remainders = excludeNets(base, excl, basecidr);

      if (remainders.length !== 1 || basecidr !== remainders[0]) {
        basenets = basenets.concat(remainders);
        basenets.splice(index, 1);
      }
    }
  }

  return basenets;
}

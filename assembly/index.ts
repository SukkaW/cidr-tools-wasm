// @ts-expect-error -- special assemblyscript instruction
@inline
export function ip_str_to_int(ip: string): i64 {
  const splitted = ip.split('.');

  return (
    i64.parse(splitted[0]) << 24
    | i64.parse(splitted[1]) << 16
    | i64.parse(splitted[2]) << 8
    | i64.parse(splitted[3])
  );
}

// @ts-expect-error -- special assemblyscript instruction
@inline
export function int_to_ip_str(number: i64): string {
  const part_0 = number >>> 24;
  const part_1 = (number >>> 16) & 0xff;
  const part_2 = (number >>> 8) & 0xff;
  const part_3 = number & 0xff;

  return `${part_0}.${part_1}.${part_2}.${part_3}`;
}

// @ts-expect-error -- special assemblyscript instruction
@inline
function number_to_binary_length(input: i64): i64 {
  let len: i64 = 0;

  while (input > 0) {
    len++;
    input >>= 1;
  }

  return len;
}

// @ts-expect-error -- special assemblyscript instruction
@inline
function create_static_tuple(a: i64, b: i64): StaticArray<i64> {
  const arr = new StaticArray<i64>(2);
  arr[0] = a;
  arr[1] = b;
  return arr;
}

export function parse(cidr: string): StaticArray<i64> {
  const splitted = cidr.split('/');
  const ip = splitted[0];

  const bitmask: i64 = splitted.length > 1 ? i64.parse(splitted[1]) : 32;
  const mask_long: i64 = bitmask > 0
    ? 0xffffffff << (32 - bitmask)
    : 0;

  const net_long: i64 = ip_str_to_int(ip) & mask_long;
  const size: i64 = 1 << (32 - bitmask);

  return create_static_tuple(
    net_long /** start */,
    net_long + size - 1 /** end */
  );
}

function mapNets(nets: StaticArray<i64>[]): Map<i64, StaticArray<i64>> {
  const v4 = new Map<i64, StaticArray<i64>>();

  for (let i = 0, len = nets.length; i < len; i++) {
    const net = nets[i];
    const start: i64 = net[0];
    const end: i64 = net[1];

    const _1 = v4.has(start) ? v4.get(start) : create_static_tuple(0, 0);
    if (_1[0]) {
      _1[0] = _1[0] + 1;
    } else {
      _1[0] = 1;
    }
    v4.set(start, _1);

    const _2 = v4.has(end) ? v4.get(end) : create_static_tuple(0, 0);
    if (_2[1]) {
      _2[1] = _2[1] + 1;
    } else {
      _2[1] = 1;
    }
    v4.set(end, _2);
  }

  return v4;
}

function subparts($start: i64, $end: i64): StaticArray<StaticArray<i64>> {
  // special case for when part is length 1
  if (($end - $start) === 1) {
    if ($end % 2 === 0) {
      const r = new StaticArray<StaticArray<i64>>(2);
      r[0] = create_static_tuple($start, $start);
      r[1] = create_static_tuple($end, $end);
      return r;
    } else {
      const r = new StaticArray<StaticArray<i64>>(1);
      r[0] = create_static_tuple($start, $end);
      return r;
    }
  }

  const size: i64 = $end + 1 - $start; /* diff($end, $start); */
  // TODO: use ctz
  let biggest: i64 = size === 0 ? 0 : (1 << (number_to_binary_length(size) - 1));

  if (size === biggest && $start + size === $end) {
    const r = new StaticArray<StaticArray<i64>>(1);
    r[0] = create_static_tuple($start, $end);
    return r;
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

  let parts: StaticArray<StaticArray<i64>> = StaticArray.fromArray([create_static_tuple(start, end)]);

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

function single_range_to_single_cidr(start: i64, end: i64): string {
  const ip = int_to_ip_str(start);
  const x = 32 - popcnt(end - start);
  return `${ip}/${x}`;
}

function inner_merge(nets: StaticArray<i64>[]): StaticArray<i64>[] {
  const merged: StaticArray<i64>[] = [];

  const maps = mapNets(nets);

  let start: i64 = -1;
  let end: i64 = -1;

  const numbers: StaticArray<i64> = StaticArray.fromArray(
    maps.keys().sort((a: i64, b: i64) => {
      if (a > b) return 1;
      if (a < b) return -1;
      return 0;
    })
  );

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
        const $2: StaticArray<i64> = p2[j];

        merged.push(create_static_tuple($2[0], $2[1]));
      }
    } else if (marker_1 && depth === 0 && ((numbers[index + 1] - numbers[index]) > 1)) {
      const p1 = subparts(start, end);
      for (let i = 0, len = p1.length; i < len; i++) {
        const $1: StaticArray<i64> = p1[i];

        merged.push(create_static_tuple($1[0], $1[1]));
      }
      start = -1;
      end = -1;
    }
  }

  return merged;
}

export function merge(nets: string[]): string[] {
  const nets_len = nets.length;
  const toBeMapped = new Array<StaticArray<i64>>(nets_len);

  for (let i = 0; i < nets_len; i++) {
    toBeMapped[i] = parse(nets[i]);
  }

  const merged = inner_merge(toBeMapped);
  const merged_len = merged.length;

  const results = new Array<string>(merged_len);

  for (let i = 0; i < merged_len; i++) {
    results[i] = single_range_to_single_cidr(merged[i][0], merged[i][1]);
  }

  return results;
}

// exclude b from a and return remainder cidrs
function exclude_nets(a: StaticArray<i64>, b: StaticArray<i64>): StaticArray<i64>[] {
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
    return [a];
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

  const remaining: StaticArray<i64>[] = [];
  let subpart: StaticArray<StaticArray<i64>>;
  let j: i32 = 0;
  let len2: i32 = 0;

  // aaaa
  //   bbbb
  // aaaa
  //   bb
  if (a_start < b_start && a_end <= b_end) {
    subpart = subparts(a_start, b_start - 1);
    j = 0;
    len2 = subpart.length;

    for (; j < len2; j++) {
      remaining.push(create_static_tuple(subpart[j][0], subpart[j][1]));
    }
  }

  //    aaa
  //   bbb
  //   aaaa
  //   bbb
  if (a_start >= b_start && a_end > b_end) {
    subpart = subparts(b_end + 1, a_end);
    j = 0;
    len2 = subpart.length;

    for (; j < len2; j++) {
      remaining.push(create_static_tuple(subpart[j][0], subpart[j][1]));
    }
  }

  //  aaaa
  //   bb
  if (a_start < b_start && a_end > b_end) {
    subpart = subparts(a_start, b_start - 1);
    j = 0;
    len2 = subpart.length;
    for (; j < len2; j++) {
      remaining.push(create_static_tuple(subpart[j][0], subpart[j][1]));
    }

    subpart = subparts(b_end + 1, a_end);
    j = 0;
    len2 = subpart.length;
    for (; j < len2; j++) {
      remaining.push(create_static_tuple(subpart[j][0], subpart[j][1]));
    }
  }

  return inner_merge(remaining);
}

export function exclude(_basenets: string[], _exclnets: string[], sort: bool = false): string[] {
  const exclnets: string[] = _exclnets.length === 1 ? _exclnets : merge(_exclnets);

  const basenets_len = _basenets.length;
  let basenets_tuple = new Array<StaticArray<i64>>(basenets_len);

  if (basenets_len === 1) {
    basenets_tuple[0] = parse(_basenets[0]);
  } else {
    for (let i = 0; i < basenets_len; i++) {
      basenets_tuple[i] = parse(_basenets[i]);
    }
    basenets_tuple = inner_merge(basenets_tuple);
  }

  for (let i = 0, len = exclnets.length; i < len; i++) {
    const exclcidr = exclnets[i];
    const excl = parse(exclcidr);

    let index = 0;
    while (index < basenets_tuple.length) {
      const base = basenets_tuple[index];
      const remainders = exclude_nets(base, excl);
      if (remainders.length !== 1 || remainders[0][0] !== base[0] || remainders[0][1] !== base[1]) {
        for (let j = 0, len = remainders.length; j < len; j++) {
          basenets_tuple.push(remainders[j]);
        }

        basenets_tuple.splice(index, 1);
      }

      index++;
    }
  }

  if (sort) {
    basenets_tuple.sort((a: StaticArray<i64>, b: StaticArray<i64>) => {
      if (a[0] > b[0]) return 1;
      if (a[0] < b[0]) return -1;
      return 0;
    });
  }

  const result_len = basenets_tuple.length;
  const results = new Array<string>(result_len);
  for (let i = 0; i < result_len; i++) {
    const net = basenets_tuple[i];
    results[i] = single_range_to_single_cidr(net[0], net[1]);
  }
  return results;
}

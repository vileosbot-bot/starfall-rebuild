// Original deterministic simulation for the Starfall web recreation.
// Numeric rules were independently transcribed from the public reference.

export const HEROES = [
  {
    "id": "tank",
    "name": "樊哙",
    "role": "坦克",
    "title": "鸿门闯帐",
    "color": "#ffcf70",
    "palette": {
      "primary": "#5f6b78",
      "secondary": "#7a4e30",
      "accent": "#d9a441",
      "glow": "#ffcf70"
    },
    "description": "持盾守护队友，以冲撞和击飞打开战局。",
    "lane": "bot",
    "difficulty": 1,
    "radius": 0.75,
    "stats": {
      "hp": 3650,
      "mp": 440,
      "ad": 158,
      "armor": 120,
      "mr": 70,
      "attackSpeed": 0.8,
      "speed": 5.6,
      "range": 2.3,
      "hpRegen": 11,
      "manaRegen": 3.2
    },
    "growth": {
      "hp": 330,
      "mana": 100,
      "ad": 9.5,
      "armor": 24,
      "mr": 9,
      "attackSpeedPct": 0.015
    },
    "skills": [
      {
        "name": "侧盾闯帐",
        "key": "Q",
        "description": "向前冲撞，击飞落点附近的敌人。",
        "cooldown": 9,
        "mana": 50,
        "range": 7.5,
        "radius": 0,
        "width": 2.2,
        "castType": "direction",
        "angle": 0,
        "cooldowns": [
          9,
          8.6,
          8.2,
          7.8,
          7.4,
          7
        ],
        "manaCosts": [
          50,
          55,
          60,
          65,
          70,
          75
        ],
        "values": {
          "damage": [
            240,
            300,
            360,
            420,
            480,
            540
          ],
          "adRatio": 0.6,
          "knockup": 0.75,
          "dashSpeed": 22,
          "impactRadius": 2.6
        },
        "castTime": 0.1
      },
      {
        "name": "拥盾怒目",
        "key": "E",
        "description": "获得护盾，同时伤害并减速身边的敌人。",
        "cooldown": 11,
        "mana": 60,
        "range": 4.5,
        "radius": 4.5,
        "width": 0,
        "castType": "self",
        "angle": 0,
        "cooldowns": [
          11,
          10.6,
          10.2,
          9.8,
          9.4,
          9
        ],
        "manaCosts": [
          60,
          65,
          70,
          75,
          80,
          85
        ],
        "values": {
          "shield": [
            300,
            390,
            480,
            570,
            660,
            750
          ],
          "hpRatio": 0.09,
          "duration": 4,
          "damage": [
            120,
            160,
            200,
            240,
            280,
            320
          ],
          "slow": 0.35,
          "slowDur": 2
        },
        "castTime": 0.2
      },
      {
        "name": "跃盾砸阵",
        "key": "R",
        "description": "跃向目标区域，击飞敌人并留下减速区域。",
        "cooldown": 50,
        "mana": 100,
        "range": 9.5,
        "radius": 4.5,
        "width": 0,
        "castType": "position",
        "angle": 0,
        "cooldowns": [
          50,
          45,
          40
        ],
        "manaCosts": [
          100,
          110,
          120
        ],
        "values": {
          "damage": [
            400,
            600,
            800
          ],
          "hpRatio": 0.06,
          "knockup": 1,
          "leapTime": 0.65,
          "zoneDur": 3,
          "slow": 0.4
        },
        "castTime": 0.65
      }
    ],
    "passive": {
      "name": "覆盾震地",
      "tags": [
        "slow"
      ],
      "values": {
        "hits": 3,
        "hpRatio": 0.04,
        "slow": 0.3,
        "slowDur": 1
      }
    },
    "build": [
      "boots",
      "guardian_plate",
      "boots_guard",
      "starweave_cloak",
      "undying_heart",
      "thorn_mail",
      "winter_scepter"
    ],
    "attackType": "melee",
    "damageType": "physical",
    "projectileSpeed": 0
  },
  {
    "id": "fighter",
    "name": "程咬金",
    "role": "战士",
    "title": "混世魔王",
    "color": "#ff7a2a",
    "palette": {
      "primary": "#cc3a26",
      "secondary": "#3a3436",
      "accent": "#e2a13a",
      "glow": "#ff7a2a"
    },
    "description": "近身缠斗，技能接普攻恢复生命，持续压制。",
    "lane": "top",
    "difficulty": 2,
    "radius": 0.62,
    "stats": {
      "hp": 3450,
      "mp": 430,
      "ad": 172,
      "armor": 104,
      "mr": 55,
      "attackSpeed": 0.9,
      "speed": 5.8,
      "range": 2.3,
      "hpRegen": 9,
      "manaRegen": 3
    },
    "growth": {
      "hp": 310,
      "mana": 95,
      "ad": 12.5,
      "armor": 21,
      "mr": 8,
      "attackSpeedPct": 0.022
    },
    "skills": [
      {
        "name": "拦腰一斧",
        "key": "Q",
        "description": "横扫前方扇形区域，造成伤害并减速。",
        "cooldown": 6.5,
        "mana": 40,
        "range": 5.5,
        "radius": 0,
        "width": 0,
        "castType": "cone",
        "angle": 1.9198621771937625,
        "cooldowns": [
          6.5,
          6.2,
          5.9,
          5.6,
          5.3,
          5
        ],
        "manaCosts": [
          40,
          44,
          48,
          52,
          56,
          60
        ],
        "values": {
          "damage": [
            220,
            275,
            330,
            385,
            440,
            495
          ],
          "adRatio": 0.8,
          "slow": 0.3,
          "slowDur": 1.5
        },
        "castTime": 0.25
      },
      {
        "name": "半路杀出",
        "key": "E",
        "description": "向前疾冲并提高攻速。",
        "cooldown": 10,
        "mana": 50,
        "range": 5.5,
        "radius": 0,
        "width": 2,
        "castType": "direction",
        "angle": 0,
        "cooldowns": [
          10,
          9.5,
          9,
          8.5,
          8,
          7.5
        ],
        "manaCosts": [
          50,
          54,
          58,
          62,
          66,
          70
        ],
        "values": {
          "damage": [
            150,
            190,
            230,
            270,
            310,
            350
          ],
          "adRatio": 0.5,
          "asBonus": [
            0.4,
            0.44,
            0.48,
            0.52,
            0.56,
            0.6
          ],
          "asDur": 4,
          "dashSpeed": 24
        },
        "castTime": 0.05
      },
      {
        "name": "抡圆了砍",
        "key": "R",
        "description": "持续旋转攻击周围目标，同时减少所受伤害。",
        "cooldown": 42,
        "mana": 100,
        "range": 4.2,
        "radius": 4.2,
        "width": 0,
        "castType": "self",
        "angle": 0,
        "cooldowns": [
          42,
          38,
          34
        ],
        "manaCosts": [
          100,
          110,
          120
        ],
        "values": {
          "duration": 3,
          "tick": 0.3,
          "damage": [
            100,
            150,
            200
          ],
          "adRatio": 0.45,
          "reduction": 0.3
        },
        "castTime": 0.1
      }
    ],
    "passive": {
      "name": "越砍越勇",
      "tags": [
        "heal"
      ],
      "values": {
        "damage": 80,
        "adRatio": 0.5,
        "healHpRatio": 0.05,
        "window": 4
      }
    },
    "build": [
      "boots",
      "blood_scythe",
      "boots_guard",
      "starfall_blade",
      "guardian_plate",
      "piercing_spear",
      "starweave_cloak"
    ],
    "attackType": "melee",
    "damageType": "physical",
    "projectileSpeed": 0
  },
  {
    "id": "mage",
    "name": "王昭君",
    "role": "法师",
    "title": "落雁出塞",
    "color": "#a9d4ff",
    "palette": {
      "primary": "#3d4c9e",
      "secondary": "#f6f0e6",
      "accent": "#c8324a",
      "glow": "#a9d4ff"
    },
    "description": "在远处拨动琴弦，以穿透音波与范围控制支援。",
    "lane": "mid",
    "difficulty": 2,
    "radius": 0.58,
    "stats": {
      "hp": 3100,
      "mp": 520,
      "ad": 150,
      "armor": 80,
      "mr": 50,
      "attackSpeed": 0.85,
      "speed": 5.5,
      "range": 7.5,
      "hpRegen": 7,
      "manaRegen": 4.2
    },
    "growth": {
      "hp": 225,
      "mana": 125,
      "ad": 8,
      "armor": 14,
      "mr": 6,
      "attackSpeedPct": 0.01
    },
    "skills": [
      {
        "name": "一弦穿云",
        "key": "Q",
        "description": "发射穿透音波，伤害沿途敌人。",
        "cooldown": 6.3,
        "mana": 50,
        "range": 12,
        "radius": 0,
        "width": 1.3,
        "castType": "direction",
        "angle": 0,
        "cooldowns": [
          6.3,
          6,
          5.7,
          5.4,
          5.1,
          4.8
        ],
        "manaCosts": [
          50,
          55,
          60,
          65,
          70,
          75
        ],
        "values": {
          "damage": [
            280,
            350,
            420,
            490,
            560,
            630
          ],
          "apRatio": 0.55,
          "speed": 26
        },
        "castTime": 0.2
      },
      {
        "name": "回环收弦",
        "key": "E",
        "description": "短暂延迟后将区域内敌人拉向中心。",
        "cooldown": 11,
        "mana": 70,
        "range": 9,
        "radius": 3.4,
        "width": 0,
        "castType": "position",
        "angle": 0,
        "cooldowns": [
          11,
          10.6,
          10.2,
          9.8,
          9.4,
          9
        ],
        "manaCosts": [
          70,
          75,
          80,
          85,
          90,
          95
        ],
        "values": {
          "damage": [
            260,
            325,
            390,
            455,
            520,
            585
          ],
          "apRatio": 0.5,
          "delay": 0.6,
          "pull": 1.6,
          "slow": 0.45,
          "slowDur": 2
        },
        "castTime": 0.25
      },
      {
        "name": "雁落平沙",
        "key": "R",
        "description": "在目标区域连续落下五波琴音，造成伤害和减速。",
        "cooldown": 48,
        "mana": 120,
        "range": 11,
        "radius": 5.2,
        "width": 0,
        "castType": "position",
        "angle": 0,
        "cooldowns": [
          48,
          43,
          38
        ],
        "manaCosts": [
          120,
          130,
          140
        ],
        "values": {
          "damage": [
            160,
            230,
            300
          ],
          "apRatio": 0.3,
          "waves": 5,
          "duration": 2.5,
          "delay": 0.5,
          "slow": 0.3,
          "slowDur": 1
        },
        "castTime": 0.4
      }
    ],
    "passive": {
      "name": "余音三叠",
      "tags": [
        "control"
      ],
      "values": {
        "stacks": 3,
        "duration": 5,
        "hpRatio": 0.06,
        "cap": 300,
        "stun": 0.75
      }
    },
    "build": [
      "boots",
      "astral_staff",
      "boots_arcane",
      "void_crown",
      "sage_codex",
      "winter_scepter",
      "starweave_cloak"
    ],
    "attackType": "ranged",
    "damageType": "magic",
    "projectileSpeed": 24
  },
  {
    "id": "marksman",
    "name": "李广",
    "role": "射手",
    "title": "汉之飞将",
    "color": "#9df5d2",
    "palette": {
      "primary": "#2f7a78",
      "secondary": "#e9e2cf",
      "accent": "#c99a45",
      "glow": "#9df5d2"
    },
    "description": "连续射击积累攻速，用翻跃保持安全距离。",
    "lane": "bot",
    "difficulty": 2,
    "radius": 0.58,
    "stats": {
      "hp": 2900,
      "mp": 440,
      "ad": 168,
      "armor": 78,
      "mr": 50,
      "attackSpeed": 0.95,
      "speed": 5.5,
      "range": 8.2,
      "hpRegen": 7,
      "manaRegen": 3
    },
    "growth": {
      "hp": 205,
      "mana": 100,
      "ad": 13,
      "armor": 14,
      "mr": 6,
      "attackSpeedPct": 0.03
    },
    "skills": [
      {
        "name": "白羽没石",
        "key": "Q",
        "description": "发射穿透兵线的重箭，命中英雄后停止并减速。",
        "cooldown": 8,
        "mana": 50,
        "range": 14,
        "radius": 0,
        "width": 1.3,
        "castType": "direction",
        "angle": 0,
        "cooldowns": [
          8,
          7.6,
          7.2,
          6.8,
          6.4,
          6
        ],
        "manaCosts": [
          50,
          55,
          60,
          65,
          70,
          75
        ],
        "values": {
          "damage": [
            280,
            350,
            420,
            490,
            560,
            630
          ],
          "adRatio": 1,
          "slow": 0.3,
          "slowDur": 1.5,
          "speed": 32,
          "minionRatio": 0.6
        },
        "castTime": 0.3
      },
      {
        "name": "飞将腾身",
        "key": "E",
        "description": "向指定方向翻跃，强化下一次普攻为必定暴击。",
        "cooldown": 9,
        "mana": 40,
        "range": 5,
        "radius": 0,
        "width": 1.2,
        "castType": "direction",
        "angle": 0,
        "cooldowns": [
          9,
          8.5,
          8,
          7.5,
          7,
          6.5
        ],
        "manaCosts": [
          40,
          42,
          44,
          46,
          48,
          50
        ],
        "values": {
          "haste": 0.2,
          "hasteDur": 2,
          "critWindow": 4,
          "dashSpeed": 26
        },
        "castTime": 0.05
      },
      {
        "name": "箭锁阴山",
        "key": "R",
        "description": "在目标区域降下箭雨，持续造成伤害和减速。",
        "cooldown": 50,
        "mana": 110,
        "range": 11.5,
        "radius": 5,
        "width": 0,
        "castType": "position",
        "angle": 0,
        "cooldowns": [
          50,
          45,
          40
        ],
        "manaCosts": [
          110,
          120,
          130
        ],
        "values": {
          "damage": [
            95,
            140,
            185
          ],
          "adRatio": 0.4,
          "duration": 3,
          "tick": 0.5,
          "delay": 0.5,
          "slow": 0.35,
          "slowDur": 0.8
        },
        "castTime": 0.4
      }
    ],
    "passive": {
      "name": "猿臂连射",
      "tags": [
        "buff"
      ],
      "values": {
        "maxStacks": 5,
        "duration": 3,
        "asPerStack": 0.06,
        "haste": 0.1,
        "bonus": 20,
        "bonusPerLevel": 4
      }
    },
    "build": [
      "boots",
      "sunchaser_bow",
      "boots_fury",
      "phantom_edge",
      "blood_scythe",
      "piercing_spear",
      "starfall_blade"
    ],
    "attackType": "ranged",
    "damageType": "physical",
    "projectileSpeed": 30
  },
  {
    "id": "assassin",
    "name": "荆轲",
    "role": "刺客",
    "title": "易水壮士",
    "color": "#a886ff",
    "palette": {
      "primary": "#3a3156",
      "secondary": "#ece8de",
      "accent": "#b48cff",
      "glow": "#a886ff"
    },
    "description": "从野区寻找机会，以突进和斩杀收割残血目标。",
    "lane": "jungle",
    "difficulty": 3,
    "radius": 0.58,
    "stats": {
      "hp": 3050,
      "mp": 440,
      "ad": 178,
      "armor": 88,
      "mr": 52,
      "attackSpeed": 0.92,
      "speed": 6,
      "range": 2.2,
      "hpRegen": 8,
      "manaRegen": 3
    },
    "growth": {
      "hp": 250,
      "mana": 100,
      "ad": 13.5,
      "armor": 16,
      "mr": 6.5,
      "attackSpeedPct": 0.022
    },
    "skills": [
      {
        "name": "风萧易水",
        "key": "Q",
        "description": "向前穿刺，命中英雄可返还部分冷却。",
        "cooldown": 7,
        "mana": 40,
        "range": 6.5,
        "radius": 0,
        "width": 2,
        "castType": "direction",
        "angle": 0,
        "cooldowns": [
          7,
          6.7,
          6.4,
          6.1,
          5.8,
          5.5
        ],
        "manaCosts": [
          40,
          44,
          48,
          52,
          56,
          60
        ],
        "values": {
          "damage": [
            200,
            255,
            310,
            365,
            420,
            475
          ],
          "adRatio": 1,
          "refund": 0.4,
          "dashSpeed": 30
        },
        "castTime": 0.05
      },
      {
        "name": "引匕一掷",
        "key": "E",
        "description": "掷出三把扇形匕首，命中目标后减速。",
        "cooldown": 8,
        "mana": 50,
        "range": 9,
        "radius": 0,
        "width": 1,
        "castType": "direction",
        "angle": 0,
        "cooldowns": [
          8,
          7.6,
          7.2,
          6.8,
          6.4,
          6
        ],
        "manaCosts": [
          50,
          54,
          58,
          62,
          66,
          70
        ],
        "values": {
          "damage": [
            165,
            210,
            255,
            300,
            345,
            390
          ],
          "adRatio": 0.65,
          "slow": 0.35,
          "slowDur": 1.5,
          "blades": 3,
          "spread": 0.2792526803190927,
          "speed": 26,
          "repeatRatio": 0.5
        },
        "castTime": 0.15
      },
      {
        "name": "卷尽匕现",
        "key": "R",
        "description": "突进至指定敌方英雄身边，根据其已损生命追加伤害。",
        "cooldown": 40,
        "mana": 100,
        "range": 8,
        "radius": 0,
        "width": 0,
        "castType": "target",
        "angle": 0,
        "cooldowns": [
          40,
          35,
          30
        ],
        "manaCosts": [
          100,
          105,
          110
        ],
        "values": {
          "damage": [
            340,
            510,
            680
          ],
          "adRatio": 1.2,
          "missingRatio": 0.2,
          "vanish": 0.35
        },
        "castTime": 0.35
      }
    ],
    "passive": {
      "name": "一去不还",
      "tags": [
        "burst"
      ],
      "values": {
        "threshold": 0.4,
        "bonus": 0.18,
        "healHpRatio": 0.08,
        "monsterBonus": 0.25
      }
    },
    "build": [
      "boots",
      "starfall_blade",
      "boots_arcane",
      "piercing_spear",
      "phantom_edge",
      "blood_scythe",
      "starweave_cloak"
    ],
    "attackType": "melee",
    "damageType": "physical",
    "projectileSpeed": 0
  }
];

export const ITEMS = [
  {
    "id": "boots",
    "name": "移速草鞋",
    "price": 250,
    "category": "boots",
    "tier": 1,
    "description": "移动速度 +0.5",
    "icon": "靴",
    "color": "#a8794f",
    "stats": {
      "moveSpeed": 0.5
    },
    "passive": null
  },
  {
    "id": "boots_guard",
    "name": "护甲铁靴",
    "price": 710,
    "category": "boots",
    "tier": 2,
    "description": "移动速度 +0.6，护甲 +110",
    "icon": "靴",
    "color": "#8d99a8",
    "stats": {
      "moveSpeed": 0.6,
      "armor": 110
    },
    "passive": null
  },
  {
    "id": "boots_arcane",
    "name": "减冷却布靴",
    "price": 710,
    "category": "boots",
    "tier": 2,
    "description": "移动速度 +0.6，冷却缩减 +15%",
    "icon": "靴",
    "color": "#7f8cff",
    "stats": {
      "moveSpeed": 0.6,
      "cdr": 0.15
    },
    "passive": null
  },
  {
    "id": "boots_fury",
    "name": "攻速皮靴",
    "price": 710,
    "category": "boots",
    "tier": 2,
    "description": "移动速度 +0.6，攻击速度 +25%",
    "icon": "靴",
    "color": "#56c7a0",
    "stats": {
      "moveSpeed": 0.6,
      "attackSpeedPct": 0.25
    },
    "passive": null
  },
  {
    "id": "starfall_blade",
    "name": "破军",
    "price": 2950,
    "category": "attack",
    "tier": 2,
    "description": "物攻 +110，冷却缩减 +10%；对半血以下单位伤害提高。",
    "icon": "刃",
    "color": "#ffb44d",
    "stats": {
      "ad": 110,
      "cdr": 0.1
    },
    "passive": {
      "id": "execute_bonus",
      "name": "收割",
      "value": 0.15,
      "value2": 0.5
    }
  },
  {
    "id": "sunchaser_bow",
    "name": "影刃",
    "price": 2070,
    "category": "attack",
    "tier": 2,
    "description": "攻速 +35%，暴击 +15%，移速 +0.25；普攻附加法术伤害。",
    "icon": "刃",
    "color": "#ffd76a",
    "stats": {
      "attackSpeedPct": 0.35,
      "critChance": 0.15,
      "moveSpeed": 0.25
    },
    "passive": {
      "id": "onhit_magic",
      "name": "附带法伤",
      "value": 45
    }
  },
  {
    "id": "blood_scythe",
    "name": "吸血环首刀",
    "price": 1800,
    "category": "attack",
    "tier": 2,
    "description": "物攻 +85，普攻吸血 +20%。",
    "icon": "刃",
    "color": "#d8433f",
    "stats": {
      "ad": 85,
      "lifesteal": 0.2
    },
    "passive": null
  },
  {
    "id": "piercing_spear",
    "name": "破甲长戟",
    "price": 2000.0,
    "category": "attack",
    "tier": 2,
    "description": "物攻 +75，无视目标 35% 护甲。",
    "icon": "刃",
    "color": "#9fb4c9",
    "stats": {
      "ad": 75,
      "armorPen": 0.35
    },
    "passive": null
  },
  {
    "id": "phantom_edge",
    "name": "无尽战刃",
    "price": 2140,
    "category": "attack",
    "tier": 2,
    "description": "物攻 +60，暴击 +30%，暴击伤害 +30%。",
    "icon": "刃",
    "color": "#b48cff",
    "stats": {
      "ad": 60,
      "critChance": 0.3,
      "critDamage": 0.3
    },
    "passive": null
  },
  {
    "id": "astral_staff",
    "name": "减冷却法杖",
    "price": 2000.0,
    "category": "magic",
    "tier": 2,
    "description": "法强 +180，法力 +300，冷却缩减 +10%。",
    "icon": "法",
    "color": "#6aa8ff",
    "stats": {
      "ap": 180,
      "mana": 300,
      "cdr": 0.1
    },
    "passive": null
  },
  {
    "id": "void_crown",
    "name": "法穿玉冠",
    "price": 2100,
    "category": "magic",
    "tier": 2,
    "description": "法强 +150，无视目标 35% 魔抗。",
    "icon": "法",
    "color": "#9b6bff",
    "stats": {
      "ap": 150,
      "magicPen": 0.35
    },
    "passive": null
  },
  {
    "id": "winter_scepter",
    "name": "减速权杖",
    "price": 2000.0,
    "category": "magic",
    "tier": 2,
    "description": "法强 +110，生命 +800；技能使目标减速。",
    "icon": "法",
    "color": "#8fe3ff",
    "stats": {
      "ap": 110,
      "hp": 800
    },
    "passive": {
      "id": "spell_slow",
      "name": "技能减速",
      "value": 0.2,
      "value2": 1
    }
  },
  {
    "id": "sage_codex",
    "name": "贤者之书",
    "price": 2090,
    "category": "magic",
    "tier": 2,
    "description": "法强 +220，总法强再提高 30%。",
    "icon": "法",
    "color": "#f1d27a",
    "stats": {
      "ap": 220,
      "apPct": 0.3
    },
    "passive": null
  },
  {
    "id": "guardian_plate",
    "name": "护甲重铠",
    "price": 1900,
    "category": "defense",
    "tier": 2,
    "description": "生命 +1000，护甲 +210；降低普攻攻击者的攻速。",
    "icon": "盾",
    "color": "#7f8ea3",
    "stats": {
      "hp": 1000.0,
      "armor": 210
    },
    "passive": {
      "id": "cripple_aura",
      "name": "减攻速",
      "value": 0.2,
      "value2": 2
    }
  },
  {
    "id": "starweave_cloak",
    "name": "魔抗狐裘",
    "price": 1850,
    "category": "defense",
    "tier": 2,
    "description": "生命 +1000，魔抗 +200；低生命时获得护盾。",
    "icon": "盾",
    "color": "#6fd0c5",
    "stats": {
      "hp": 1000.0,
      "mr": 200
    },
    "passive": {
      "id": "spell_shield",
      "name": "保命盾",
      "value": 600,
      "value2": 60
    }
  },
  {
    "id": "undying_heart",
    "name": "回血护心镜",
    "price": 2000.0,
    "category": "defense",
    "tier": 2,
    "description": "生命 +2000；离开战斗后持续恢复生命。",
    "icon": "盾",
    "color": "#e0566f",
    "stats": {
      "hp": 2000.0
    },
    "passive": {
      "id": "regen_ooc",
      "name": "脱战回血",
      "value": 0.02
    }
  },
  {
    "id": "thorn_mail",
    "name": "反伤钉盾",
    "price": 1750,
    "category": "defense",
    "tier": 2,
    "description": "生命 +500，护甲 +170；反弹一部分普攻伤害。",
    "icon": "盾",
    "color": "#7da36b",
    "stats": {
      "hp": 500,
      "armor": 170
    },
    "passive": {
      "id": "thorns",
      "name": "反伤",
      "value": 0.18
    }
  }
];

export const MAP = {
  "bound": 57.5,
  "lanes": {
    "top": [
      {
        "x": -52,
        "y": 42
      },
      {
        "x": -52,
        "y": -45
      },
      {
        "x": -51,
        "y": -49
      },
      {
        "x": -49,
        "y": -51
      },
      {
        "x": -45,
        "y": -52
      },
      {
        "x": 42,
        "y": -52
      }
    ],
    "mid": [
      {
        "x": -43,
        "y": 43
      },
      {
        "x": -36,
        "y": 36
      },
      {
        "x": 0,
        "y": 0
      },
      {
        "x": 36,
        "y": -36
      },
      {
        "x": 43,
        "y": -43
      }
    ],
    "bot": [
      {
        "x": -42,
        "y": 52
      },
      {
        "x": 45,
        "y": 52
      },
      {
        "x": 49,
        "y": 51
      },
      {
        "x": 51,
        "y": 49
      },
      {
        "x": 52,
        "y": 45
      },
      {
        "x": 52,
        "y": -42
      }
    ]
  },
  "laneWidth": 10,
  "river": [
    {
      "x": -52,
      "y": -52
    },
    {
      "x": 0,
      "y": 0
    },
    {
      "x": 52,
      "y": 52
    }
  ],
  "riverWidth": 10.6,
  "fountains": {
    "blue": {
      "x": -54,
      "y": 54
    },
    "red": {
      "x": 54,
      "y": -54
    }
  },
  "fountainRadius": 4.5,
  "cores": {
    "blue": {
      "x": -47,
      "y": 47
    },
    "red": {
      "x": 47,
      "y": -47
    }
  },
  "towers": [
    {
      "lane": "top",
      "tier": 1,
      "team": "blue",
      "x": -48.6,
      "y": -24
    },
    {
      "lane": "top",
      "tier": 1,
      "team": "red",
      "x": -24,
      "y": -48.6
    },
    {
      "lane": "top",
      "tier": 2,
      "team": "blue",
      "x": -55.4,
      "y": 4
    },
    {
      "lane": "top",
      "tier": 2,
      "team": "red",
      "x": 4,
      "y": -55.4
    },
    {
      "lane": "top",
      "tier": 3,
      "team": "blue",
      "x": -48.6,
      "y": 27
    },
    {
      "lane": "top",
      "tier": 3,
      "team": "red",
      "x": 27,
      "y": -48.6
    },
    {
      "lane": "mid",
      "tier": 1,
      "team": "blue",
      "x": -12.9,
      "y": 8.1
    },
    {
      "lane": "mid",
      "tier": 1,
      "team": "red",
      "x": 8.1,
      "y": -12.9
    },
    {
      "lane": "mid",
      "tier": 2,
      "team": "blue",
      "x": -18.6,
      "y": 23.4
    },
    {
      "lane": "mid",
      "tier": 2,
      "team": "red",
      "x": 23.4,
      "y": -18.6
    },
    {
      "lane": "mid",
      "tier": 3,
      "team": "blue",
      "x": -32.4,
      "y": 27.6
    },
    {
      "lane": "mid",
      "tier": 3,
      "team": "red",
      "x": 27.6,
      "y": -32.4
    },
    {
      "lane": "bot",
      "tier": 1,
      "team": "blue",
      "x": 24,
      "y": 48.6
    },
    {
      "lane": "bot",
      "tier": 1,
      "team": "red",
      "x": 48.6,
      "y": 24
    },
    {
      "lane": "bot",
      "tier": 2,
      "team": "blue",
      "x": -4,
      "y": 55.4
    },
    {
      "lane": "bot",
      "tier": 2,
      "team": "red",
      "x": 55.4,
      "y": -4
    },
    {
      "lane": "bot",
      "tier": 3,
      "team": "blue",
      "x": -27,
      "y": 48.6
    },
    {
      "lane": "bot",
      "tier": 3,
      "team": "red",
      "x": 48.6,
      "y": -27
    }
  ],
  "walls": [
    [
      {
        "x": -46.5,
        "y": 35
      },
      {
        "x": -42.5,
        "y": 35
      },
      {
        "x": -30.5,
        "y": 23
      },
      {
        "x": -34,
        "y": 17.5
      },
      {
        "x": -46.5,
        "y": 19
      }
    ],
    [
      {
        "x": -35,
        "y": 46.5
      },
      {
        "x": -35,
        "y": 42.5
      },
      {
        "x": -23,
        "y": 30.5
      },
      {
        "x": -17.5,
        "y": 34
      },
      {
        "x": -19,
        "y": 46.5
      }
    ],
    [
      {
        "x": 35,
        "y": -46.5
      },
      {
        "x": 35,
        "y": -42.5
      },
      {
        "x": 23,
        "y": -30.5
      },
      {
        "x": 17.5,
        "y": -34
      },
      {
        "x": 19,
        "y": -46.5
      }
    ],
    [
      {
        "x": 46.5,
        "y": -35
      },
      {
        "x": 42.5,
        "y": -35
      },
      {
        "x": 30.5,
        "y": -23
      },
      {
        "x": 34,
        "y": -17.5
      },
      {
        "x": 46.5,
        "y": -19
      }
    ],
    [
      {
        "x": -46.5,
        "y": 13
      },
      {
        "x": -41.5,
        "y": 12.5
      },
      {
        "x": -41,
        "y": -11.5
      },
      {
        "x": -46.5,
        "y": -12
      }
    ],
    [
      {
        "x": -13,
        "y": 46.5
      },
      {
        "x": -12.5,
        "y": 41.5
      },
      {
        "x": 11.5,
        "y": 41
      },
      {
        "x": 12,
        "y": 46.5
      }
    ],
    [
      {
        "x": 13,
        "y": -46.5
      },
      {
        "x": 12.5,
        "y": -41.5
      },
      {
        "x": -11.5,
        "y": -41
      },
      {
        "x": -12,
        "y": -46.5
      }
    ],
    [
      {
        "x": 46.5,
        "y": -13
      },
      {
        "x": 41.5,
        "y": -12.5
      },
      {
        "x": 41,
        "y": 11.5
      },
      {
        "x": 46.5,
        "y": 12
      }
    ],
    [
      {
        "x": -46.5,
        "y": -18
      },
      {
        "x": -40.5,
        "y": -18.5
      },
      {
        "x": -34,
        "y": -19.5
      },
      {
        "x": -30.5,
        "y": -23
      },
      {
        "x": -46.5,
        "y": -39
      }
    ],
    [
      {
        "x": 18,
        "y": 46.5
      },
      {
        "x": 18.5,
        "y": 40.5
      },
      {
        "x": 19.5,
        "y": 34
      },
      {
        "x": 23,
        "y": 30.5
      },
      {
        "x": 39,
        "y": 46.5
      }
    ],
    [
      {
        "x": -18,
        "y": -46.5
      },
      {
        "x": -18.5,
        "y": -40.5
      },
      {
        "x": -19.5,
        "y": -34
      },
      {
        "x": -23,
        "y": -30.5
      },
      {
        "x": -39,
        "y": -46.5
      }
    ],
    [
      {
        "x": 46.5,
        "y": 18
      },
      {
        "x": 40.5,
        "y": 18.5
      },
      {
        "x": 34,
        "y": 19.5
      },
      {
        "x": 30.5,
        "y": 23
      },
      {
        "x": 46.5,
        "y": 39
      }
    ],
    [
      {
        "x": -26,
        "y": 18.5
      },
      {
        "x": -14,
        "y": 6.5
      },
      {
        "x": -17.5,
        "y": 3
      },
      {
        "x": -29.5,
        "y": 15
      }
    ],
    [
      {
        "x": -18.5,
        "y": 26
      },
      {
        "x": -6.5,
        "y": 14
      },
      {
        "x": -3,
        "y": 17.5
      },
      {
        "x": -15,
        "y": 29.5
      }
    ],
    [
      {
        "x": 18.5,
        "y": -26
      },
      {
        "x": 6.5,
        "y": -14
      },
      {
        "x": 3,
        "y": -17.5
      },
      {
        "x": 15,
        "y": -29.5
      }
    ],
    [
      {
        "x": 26,
        "y": -18.5
      },
      {
        "x": 14,
        "y": -6.5
      },
      {
        "x": 17.5,
        "y": -3
      },
      {
        "x": 29.5,
        "y": -15
      }
    ],
    [
      {
        "x": -14,
        "y": -6.5
      },
      {
        "x": -25,
        "y": -17.5
      },
      {
        "x": -28.5,
        "y": -14
      },
      {
        "x": -17.5,
        "y": -3
      }
    ],
    [
      {
        "x": 6.5,
        "y": 14
      },
      {
        "x": 17.5,
        "y": 25
      },
      {
        "x": 14,
        "y": 28.5
      },
      {
        "x": 3,
        "y": 17.5
      }
    ],
    [
      {
        "x": -6.5,
        "y": -14
      },
      {
        "x": -17.5,
        "y": -25
      },
      {
        "x": -14,
        "y": -28.5
      },
      {
        "x": -3,
        "y": -17.5
      }
    ],
    [
      {
        "x": 14,
        "y": 6.5
      },
      {
        "x": 25,
        "y": 17.5
      },
      {
        "x": 28.5,
        "y": 14
      },
      {
        "x": 17.5,
        "y": 3
      }
    ],
    [
      {
        "x": -36,
        "y": 6
      },
      {
        "x": -30,
        "y": 7
      },
      {
        "x": -24.5,
        "y": 1.5
      },
      {
        "x": -25,
        "y": -3
      },
      {
        "x": -31,
        "y": -7.5
      },
      {
        "x": -36,
        "y": -6.5
      }
    ],
    [
      {
        "x": -6,
        "y": 36
      },
      {
        "x": -7,
        "y": 30
      },
      {
        "x": -1.5,
        "y": 24.5
      },
      {
        "x": 3,
        "y": 25
      },
      {
        "x": 7.5,
        "y": 31
      },
      {
        "x": 6.5,
        "y": 36
      }
    ],
    [
      {
        "x": 6,
        "y": -36
      },
      {
        "x": 7,
        "y": -30
      },
      {
        "x": 1.5,
        "y": -24.5
      },
      {
        "x": -3,
        "y": -25
      },
      {
        "x": -7.5,
        "y": -31
      },
      {
        "x": -6.5,
        "y": -36
      }
    ],
    [
      {
        "x": 36,
        "y": -6
      },
      {
        "x": 30,
        "y": -7
      },
      {
        "x": 24.5,
        "y": -1.5
      },
      {
        "x": 25,
        "y": 3
      },
      {
        "x": 31,
        "y": 7.5
      },
      {
        "x": 36,
        "y": 6.5
      }
    ]
  ],
  "bushes": [
    [
      {
        "x": -57.3,
        "y": -40
      },
      {
        "x": -54.6,
        "y": -40
      },
      {
        "x": -54.6,
        "y": -31
      },
      {
        "x": -57.3,
        "y": -31
      }
    ],
    [
      {
        "x": 40,
        "y": 57.3
      },
      {
        "x": 40,
        "y": 54.6
      },
      {
        "x": 31,
        "y": 54.6
      },
      {
        "x": 31,
        "y": 57.3
      }
    ],
    [
      {
        "x": -40,
        "y": -57.3
      },
      {
        "x": -40,
        "y": -54.6
      },
      {
        "x": -31,
        "y": -54.6
      },
      {
        "x": -31,
        "y": -57.3
      }
    ],
    [
      {
        "x": 57.3,
        "y": 40
      },
      {
        "x": 54.6,
        "y": 40
      },
      {
        "x": 54.6,
        "y": 31
      },
      {
        "x": 57.3,
        "y": 31
      }
    ],
    [
      {
        "x": -46.3,
        "y": 13.6
      },
      {
        "x": -42.2,
        "y": 13.4
      },
      {
        "x": -42.2,
        "y": 18.6
      },
      {
        "x": -46.3,
        "y": 18.6
      }
    ],
    [
      {
        "x": -13.6,
        "y": 46.3
      },
      {
        "x": -13.4,
        "y": 42.2
      },
      {
        "x": -18.6,
        "y": 42.2
      },
      {
        "x": -18.6,
        "y": 46.3
      }
    ],
    [
      {
        "x": 13.6,
        "y": -46.3
      },
      {
        "x": 13.4,
        "y": -42.2
      },
      {
        "x": 18.6,
        "y": -42.2
      },
      {
        "x": 18.6,
        "y": -46.3
      }
    ],
    [
      {
        "x": 46.3,
        "y": -13.6
      },
      {
        "x": 42.2,
        "y": -13.4
      },
      {
        "x": 42.2,
        "y": -18.6
      },
      {
        "x": 46.3,
        "y": -18.6
      }
    ],
    [
      {
        "x": -30,
        "y": 22.5
      },
      {
        "x": -26.5,
        "y": 19
      },
      {
        "x": -29,
        "y": 16.5
      },
      {
        "x": -32,
        "y": 20
      }
    ],
    [
      {
        "x": -22.5,
        "y": 30
      },
      {
        "x": -19,
        "y": 26.5
      },
      {
        "x": -16.5,
        "y": 29
      },
      {
        "x": -20,
        "y": 32
      }
    ],
    [
      {
        "x": 22.5,
        "y": -30
      },
      {
        "x": 19,
        "y": -26.5
      },
      {
        "x": 16.5,
        "y": -29
      },
      {
        "x": 20,
        "y": -32
      }
    ],
    [
      {
        "x": 30,
        "y": -22.5
      },
      {
        "x": 26.5,
        "y": -19
      },
      {
        "x": 29,
        "y": -16.5
      },
      {
        "x": 32,
        "y": -20
      }
    ],
    [
      {
        "x": -25.5,
        "y": -18
      },
      {
        "x": -30,
        "y": -22.5
      },
      {
        "x": -32,
        "y": -20.5
      },
      {
        "x": -27.5,
        "y": -16
      }
    ],
    [
      {
        "x": 18,
        "y": 25.5
      },
      {
        "x": 22.5,
        "y": 30
      },
      {
        "x": 20.5,
        "y": 32
      },
      {
        "x": 16,
        "y": 27.5
      }
    ],
    [
      {
        "x": -18,
        "y": -25.5
      },
      {
        "x": -22.5,
        "y": -30
      },
      {
        "x": -20.5,
        "y": -32
      },
      {
        "x": -16,
        "y": -27.5
      }
    ],
    [
      {
        "x": 25.5,
        "y": 18
      },
      {
        "x": 30,
        "y": 22.5
      },
      {
        "x": 32,
        "y": 20.5
      },
      {
        "x": 27.5,
        "y": 16
      }
    ],
    [
      {
        "x": -14,
        "y": 4
      },
      {
        "x": -10.5,
        "y": 1.2
      },
      {
        "x": -10.5,
        "y": -1.2
      },
      {
        "x": -14,
        "y": -4
      }
    ],
    [
      {
        "x": -4,
        "y": 14
      },
      {
        "x": -1.2,
        "y": 10.5
      },
      {
        "x": 1.2,
        "y": 10.5
      },
      {
        "x": 4,
        "y": 14
      }
    ],
    [
      {
        "x": 4,
        "y": -14
      },
      {
        "x": 1.2,
        "y": -10.5
      },
      {
        "x": -1.2,
        "y": -10.5
      },
      {
        "x": -4,
        "y": -14
      }
    ],
    [
      {
        "x": 14,
        "y": -4
      },
      {
        "x": 10.5,
        "y": -1.2
      },
      {
        "x": 10.5,
        "y": 1.2
      },
      {
        "x": 14,
        "y": 4
      }
    ],
    [
      {
        "x": -57.3,
        "y": -57.3
      },
      {
        "x": -51,
        "y": -57.3
      },
      {
        "x": -57.3,
        "y": -51
      }
    ],
    [
      {
        "x": 57.3,
        "y": 57.3
      },
      {
        "x": 57.3,
        "y": 51
      },
      {
        "x": 51,
        "y": 57.3
      }
    ]
  ],
  "camps": [
    {
      "id": 0,
      "variant": "frost_golem",
      "x": -36.5,
      "y": 12.5,
      "count": 1,
      "firstSpawn": 25,
      "respawn": 90,
      "side": "blue",
      "radius": 3.6
    },
    {
      "id": 1,
      "variant": "glimwing",
      "x": -35,
      "y": -13,
      "count": 2,
      "firstSpawn": 25,
      "respawn": 55,
      "side": "blue",
      "radius": 2.8
    },
    {
      "id": 2,
      "variant": "mossback",
      "x": -20.5,
      "y": 0,
      "count": 1,
      "firstSpawn": 25,
      "respawn": 55,
      "side": "blue",
      "radius": 2.8
    },
    {
      "id": 3,
      "variant": "ember_golem",
      "x": -12.5,
      "y": 36.5,
      "count": 1,
      "firstSpawn": 25,
      "respawn": 90,
      "side": "blue",
      "radius": 3.6
    },
    {
      "id": 4,
      "variant": "glimwing",
      "x": 13,
      "y": 35,
      "count": 2,
      "firstSpawn": 25,
      "respawn": 55,
      "side": "blue",
      "radius": 2.8
    },
    {
      "id": 5,
      "variant": "mossback",
      "x": 0,
      "y": 20.5,
      "count": 1,
      "firstSpawn": 25,
      "respawn": 55,
      "side": "blue",
      "radius": 2.8
    },
    {
      "id": 6,
      "variant": "frost_golem",
      "x": 12.5,
      "y": -36.5,
      "count": 1,
      "firstSpawn": 25,
      "respawn": 90,
      "side": "red",
      "radius": 3.6
    },
    {
      "id": 7,
      "variant": "glimwing",
      "x": -13,
      "y": -35,
      "count": 2,
      "firstSpawn": 25,
      "respawn": 55,
      "side": "red",
      "radius": 2.8
    },
    {
      "id": 8,
      "variant": "mossback",
      "x": 0,
      "y": -20.5,
      "count": 1,
      "firstSpawn": 25,
      "respawn": 55,
      "side": "red",
      "radius": 2.8
    },
    {
      "id": 9,
      "variant": "ember_golem",
      "x": 36.5,
      "y": -12.5,
      "count": 1,
      "firstSpawn": 25,
      "respawn": 90,
      "side": "red",
      "radius": 3.6
    },
    {
      "id": 10,
      "variant": "glimwing",
      "x": 35,
      "y": 13,
      "count": 2,
      "firstSpawn": 25,
      "respawn": 55,
      "side": "red",
      "radius": 2.8
    },
    {
      "id": 11,
      "variant": "mossback",
      "x": 20.5,
      "y": 0,
      "count": 1,
      "firstSpawn": 25,
      "respawn": 55,
      "side": "red",
      "radius": 2.8
    },
    {
      "id": 12,
      "variant": "abyss_drake",
      "x": -24,
      "y": -24,
      "count": 1,
      "firstSpawn": 120,
      "respawn": 150,
      "side": "neutral",
      "radius": 5.2
    },
    {
      "id": 13,
      "variant": "star_colossus",
      "x": 24,
      "y": 24,
      "count": 1,
      "firstSpawn": 270,
      "respawn": 210,
      "side": "neutral",
      "radius": 5.2
    }
  ]
};

const HERO_BY_ID = new Map(HEROES.map(h => [h.id, h]));
const ITEM_BY_ID = new Map(ITEMS.map(i => [i.id, i]));
const TEAMS = ['blue', 'red'];
const OTHER = { blue: 'red', red: 'blue' };
const SKILL_SLOTS = ['s1', 's2', 'ult'];
const XP_SHARES = [1, .7, .52, .42, .36];
const START_GOLD = 50; // original value; the Pro baseline started every hero at 300
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const point = (x, y) => ({ x, y });
const sign = team => team === 'blue' ? 1 : -1;

const MINIONS = {
  melee: { name: '近战兵', hp: 1100, hpGrowth: 75, ad: 58, adGrowth: 4, armor: 40, range: 1.9, speed: 4, attackSpeed: .8, radius: .5, gold: 56, xp: 95, towerMult: .6 },
  ranged: { name: '远程兵', hp: 720, hpGrowth: 45, ad: 84, adGrowth: 6, armor: 20, range: 6.5, speed: 4, attackSpeed: .75, radius: .45, gold: 45, xp: 70, towerMult: .6 },
  siege: { name: '攻城兵', hp: 2000, hpGrowth: 140, ad: 150, adGrowth: 10, armor: 80, range: 8, speed: 3.8, attackSpeed: .5, radius: .8, gold: 104, xp: 160, towerMult: 1.6 },
  super: { name: '超级兵', hp: 4500, hpGrowth: 300, ad: 220, adGrowth: 14, armor: 120, range: 2.3, speed: 4, attackSpeed: .85, radius: .9, gold: 118, xp: 180, towerMult: 1.2 }
};
const MONSTERS = {
  mossback: { name: '苔背獾', hp: 2200, hpGrowth: 150, ad: 70, adGrowth: 5, armor: 60, mr: 40, attackSpeed: .7, range: 2, speed: 4.6, radius: .9, gold: 54, xp: 77 },
  glimwing: { name: '荧翅蛾', hp: 1250, hpGrowth: 85, ad: 55, adGrowth: 4, armor: 30, mr: 30, attackSpeed: .9, range: 5, speed: 4.8, radius: .6, gold: 31, xp: 45 },
  frost_golem: { name: '霜晶巨鹿 · 蓝', hp: 4200, hpGrowth: 280, ad: 110, adGrowth: 7, armor: 90, mr: 60, attackSpeed: .65, range: 2.4, speed: 4.4, radius: 1.3, gold: 97, xp: 138 },
  ember_golem: { name: '炽焰巨熊 · 红', hp: 4200, hpGrowth: 280, ad: 110, adGrowth: 7, armor: 90, mr: 60, attackSpeed: .65, range: 2.4, speed: 4.4, radius: 1.3, gold: 97, xp: 138 },
  abyss_drake: { name: '河道巨龙', hp: 9000, hpGrowth: 600, ad: 190, adGrowth: 12, armor: 120, mr: 100, attackSpeed: .6, range: 3.2, speed: 4, radius: 2, gold: 80, xp: 120 },
  star_colossus: { name: '星陨巨灵', hp: 16000, hpGrowth: 900, ad: 260, adGrowth: 16, armor: 160, mr: 140, attackSpeed: .55, range: 3.6, speed: 3.8, radius: 2.4, gold: 120, xp: 180 }
};

// ---------------------------------------------------------------------------
// PACING: every match-length tuning number lives here (target: core falls at 12-20 min).
// Building max HP, hero stats, items, economy and win logic are NOT pacing levers and are untouched.
// ---------------------------------------------------------------------------
const PACING = {
  // Early "fortification": incoming damage multiplier on structures, per tower tier (core uses `core`).
  // Holds at `mult` until `holdUntil` seconds, then fades linearly to 1 (no reduction) at `fadeEnd`.
  // Outer (tier 1) towers are never fortified, so first-tower timing and the 40% no-minion rule are unchanged.
  fortify: {
    1: { mult: 1, holdUntil: 0, fadeEnd: 0 },
    2: { mult: .4, holdUntil: 600, fadeEnd: 840 },
    3: { mult: .25, holdUntil: 720, fadeEnd: 960 },
    core: { mult: .2, holdUntil: 780, fadeEnd: 1020 }
  },
  unaccompaniedMult: .4,        // structure damage multiplier with no attacking minion within 10 units (unchanged)
  structureRampStart: 900,      // s: late-game structure damage escalation starts (was 660)
  structureRampPerMin: .3,      // +x structure damage per minute after structureRampStart (was .2)
  minionOvertimeStart: 900,     // s: minion hp/ad overtime scaling starts (was 660)
  minionOvertimePerMin: .3,     // +x minion hp/ad per minute after minionOvertimeStart (was .22)
  groupPushAt: 780,             // s: AI heroes leave lanes/jungle and group on the weakest lane (was 390)
  coreRegenPerSec: 40,          // core hp regen when not hit for coreRegenDelay seconds (unchanged)
  coreRegenDelay: 8,            // (unchanged)
  // hero respawn = min(respawnMax, respawnBase + level * respawnPerLevel + max(0, t - respawnLateStart) / respawnLateDivisor) (all unchanged)
  respawnBase: 6, respawnPerLevel: 1.5, respawnLateStart: 600, respawnLateDivisor: 20, respawnMax: 60
};
function fortification(target, time) {
  const f = PACING.fortify[target.type === 'core' ? 'core' : target.tier];
  if (!f || time >= f.fadeEnd) return 1;
  if (time <= f.holdUntil) return f.mult;
  return f.mult + (1 - f.mult) * (time - f.holdUntil) / (f.fadeEnd - f.holdUntil);
}

function contains(p, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
function segmentDistance(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, den = dx * dx + dy * dy;
  const t = den ? clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / den, 0, 1) : 0;
  return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t);
}
function terrainFree(x, y, r = .58) {
  if (Math.abs(x) > MAP.bound - r || Math.abs(y) > MAP.bound - r) return false;
  const p = { x, y };
  for (const wall of MAP.walls) {
    if (contains(p, wall)) return false;
    for (let i = 0; i < wall.length; i++) if (segmentDistance(p, wall[i], wall[(i + 1) % wall.length]) < r) return false;
  }
  return true;
}
function clearLine(a, b, r = .58) {
  const count = Math.ceil(distance(a, b) / 1.1);
  for (let i = 1; i <= count; i++) if (!terrainFree(a.x + (b.x - a.x) * i / count, a.y + (b.y - a.y) * i / count, r)) return false;
  return true;
}

// A small deterministic A* grid is shared across matches; no DOM or graphics API.
let navigation = null;
function getNavigation() {
  if (navigation) return navigation;
  const cell = 1.25, origin = -56.25, n = 91, walkable = new Uint8Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) walkable[y * n + x] = terrainFree(origin + x * cell, origin + y * cell, .7) ? 1 : 0;
  navigation = { cell, origin, n, walkable };
  return navigation;
}
function findPath(start, finish, radius = .58) {
  const safeFinish = { x: clamp(finish.x, -56.5, 56.5), y: clamp(finish.y, -56.5, 56.5) };
  if (clearLine(start, safeFinish, Math.min(radius, .72))) return [safeFinish];
  const g = getNavigation(), { n, origin, cell, walkable } = g;
  const index = p => clamp(Math.round((p.y - origin) / cell), 0, n - 1) * n + clamp(Math.round((p.x - origin) / cell), 0, n - 1);
  const pos = i => ({ x: origin + (i % n) * cell, y: origin + Math.floor(i / n) * cell });
  const nearest = p => {
    const at = index(p); if (walkable[at]) return at;
    const ax = at % n, ay = Math.floor(at / n);
    let best = at, score = Infinity;
    for (let rad = 1; rad <= 12; rad++) {
      for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
        if (Math.abs(dx) !== rad && Math.abs(dy) !== rad) continue;
        const x = ax + dx, y = ay + dy, id = y * n + x;
        if (x < 0 || x >= n || y < 0 || y >= n || !walkable[id]) continue;
        const d = distance(pos(id), p);
        if (d < score) { best = id; score = d; }
      }
      if (score < Infinity) return best;
    }
    return best;
  };
  const first = nearest(start), last = nearest(safeFinish);
  if (first === last) return [pos(last)];
  const costs = new Float64Array(n * n).fill(Infinity), parents = new Int32Array(n * n).fill(-1), closed = new Uint8Array(n * n);
  const heap = [];
  const push = (id, cost) => {
    let i = heap.length; heap.push({ id, cost });
    while (i) { const p = (i - 1) >> 1; if (heap[p].cost <= cost) break; heap[i] = heap[p]; i = p; } heap[i] = { id, cost };
  };
  const pop = () => {
    const root = heap[0], tail = heap.pop();
    if (heap.length) { let i = 0; while (i * 2 + 1 < heap.length) { let c = i * 2 + 1; if (c + 1 < heap.length && heap[c + 1].cost < heap[c].cost) c++; if (heap[c].cost >= tail.cost) break; heap[i] = heap[c]; i = c; } heap[i] = tail; }
    return root.id;
  };
  costs[first] = 0; push(first, distance(pos(first), pos(last)) / cell);
  let found = first, closest = Infinity, expanded = 0;
  while (heap.length && expanded++ < 7000) {
    const at = pop(); if (closed[at]) continue; closed[at] = 1;
    const ax = at % n, ay = Math.floor(at / n), lx = last % n, ly = Math.floor(last / n);
    const heuristic = Math.hypot(ax - lx, ay - ly);
    if (heuristic < closest) { closest = heuristic; found = at; }
    if (at === last) break;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const x = ax + dx, y = ay + dy, next = y * n + x;
      if (x < 0 || x >= n || y < 0 || y >= n || !walkable[next] || closed[next]) continue;
      if (dx && dy && (!walkable[ay * n + x] || !walkable[y * n + ax])) continue;
      const nc = costs[at] + (dx && dy ? Math.SQRT2 : 1);
      if (nc >= costs[next]) continue;
      costs[next] = nc; parents[next] = at; push(next, nc + Math.hypot(x - lx, y - ly));
    }
  }
  const path = [];
  for (let at = found; at !== first && at >= 0; at = parents[at]) path.push(pos(at));
  path.reverse();
  if (found === last && terrainFree(safeFinish.x, safeFinish.y, Math.min(radius, .72))) path.push(safeFinish);
  if (!path.length) return [];
  const smooth = []; let anchor = start;
  for (let i = 0; i < path.length;) {
    let end = Math.min(path.length - 1, i + 12);
    while (end > i && !clearLine(anchor, path[end], Math.min(radius, .72))) end--;
    smooth.push(path[end]); anchor = path[end]; i = end + 1;
  }
  return smooth;
}
function laneProjection(p, lane) {
  const pts = MAP.lanes[lane]; let total = 0, nearest = Infinity, progress = 0, projected = pts[0];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
    const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (len * len), 0, 1);
    const q = { x: a.x + dx * t, y: a.y + dy * t }, d = distance(p, q);
    if (d < nearest) { nearest = d; progress = total + len * t; projected = q; }
    total += len;
  }
  return { progress, total, distance: nearest, point: projected };
}
function lanePoint(lane, progress) {
  const pts = MAP.lanes[lane]; let left = Math.max(0, progress);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], len = distance(a, b);
    if (left <= len) return { x: a.x + (b.x - a.x) * left / len, y: a.y + (b.y - a.y) * left / len };
    left -= len;
  }
  return { ...pts[pts.length - 1] };
}
function skillRanks(level) {
  const ranks = [0, 0, 0]; let ordinary = 0;
  for (let i = 1; i <= level; i++) {
    if (i === 4 || i === 8 || i === 12) ranks[2]++;
    else ranks[(ordinary++) % 2]++;
  }
  return ranks;
}
function skillValue(def, name, rank) {
  const value = def.values[name];
  return Array.isArray(value) ? value[clamp(rank - 1, 0, value.length - 1)] : (value ?? 0);
}

export class World {
  constructor(options = {}) {
    this.options = { difficulty: 'normal', heroId: 'mage', seed: 1122, demo: false, ...options };
    this.time = 0; this.entities = []; this.effects = []; this.events = []; this.winner = null;
    this.score = { blue: 0, red: 0 }; this.input = { x: 0, y: 0 }; this.paused = false;
    this.wave = 0; this.nextWave = 10; this.nextWaveIn = 10;
    this._id = 1; this._effectId = 1; this._eventId = 1; this._seed = (this.options.seed >>> 0) || 1;
    this._pending = []; this._zones = []; this._grid = new Map(); this._firstBlood = false;
    this._camps = MAP.camps.map(c => ({ ...c, spawnAt: c.firstSpawn, members: [] }));
    this._blessing = { blue: 0, red: 0 }; this._timeSinceGrid = 0;
    const selected = HERO_BY_ID.get(this.options.heroId) || HEROES[0];
    const order = [selected, ...HEROES.filter(h => h !== selected)];
    const offsets = [[0, 0], [1.8, .6], [-.6, -1.8], [1.6, -1.6], [2.8, -2.8]];
    for (const team of TEAMS) order.forEach((def, i) => {
      const base = MAP.fountains[team], o = offsets[i];
      const hero = this._unit('hero', team, base.x + (team === 'blue' ? o[0] : o[1]), base.y + (team === 'blue' ? o[1] : o[0]), def.name);
      Object.assign(hero, { heroId: def.id, role: def.role, color: def.color, lane: def.lane, radius: def.radius,
        level: 1, xp: 0, xpToNext: 160, gold: START_GOLD, goldEarned: START_GOLD, kills: 0, deaths: 0, assists: 0, cs: 0,
        items: [], cooldowns: [0, 0, 0], skillLevels: [1, 0, 0], flashCooldown: 0, healCooldown: 0, recallTimer: 0,
        respawnTimer: 0, isPlayer: team === 'blue' && i === 0, autoBuy: this.options.autoBuy !== false,
        _think: i * .04, _buyTimer: .7, _attackOrder: false, _retreating: false, _streak: 0, _deathStreak: 0,
        _damagers: new Map(), _marks: new Map(), _lastCombat: -100, _lastKill: -100, _multiKill: 0,
        _passiveHits: 0, _passiveStacks: 0, _passiveUntil: 0, _empoweredUntil: 0, _critUntil: 0,
        _burnUntil: 0, _frostUntil: 0, _shieldProcAt: -100, _gankAt: 100 + i * 8 });
      this._recalculate(hero, true); this.entities.push(hero);
      if (hero.isPlayer) this.player = hero;
    });
    for (const spec of MAP.towers) {
      const values = [[7200, 420, 80], [8500, 480, 110], [12000, 540, 140]][spec.tier - 1];
      const tower = this._unit('tower', spec.team, spec.x, spec.y, `${{top:'上路',mid:'中路',bot:'下路'}[spec.lane]}${spec.tier === 3 ? '高地塔' : `${spec.tier}塔`}`);
      Object.assign(tower, spec, { id: tower.id, type: 'tower', hp: values[0], maxHp: values[0], ad: values[1], armor: values[2], mr: values[2], range: 8.5, attackSpeed: 1, radius: 1.6, protected: spec.tier > 1, _focusHits: 0, _focusTarget: -1 });
      this.entities.push(tower);
    }
    for (const team of TEAMS) {
      const p = MAP.cores[team], core = this._unit('core', team, p.x, p.y, team === 'blue' ? '我方水晶' : '敌方水晶');
      Object.assign(core, { hp: 19000, maxHp: 19000, ad: 560, armor: 150, mr: 150, range: 9, attackSpeed: 1, radius: 2.6, protected: true, _focusHits: 0, _focusTarget: -1 });
      this.entities.push(core);
    }
    this._buildGrid(); this._updateVisibility();
    this._event('start', '星陨战场 · 战斗开始', 'blue');
  }

  random() { this._seed = (Math.imul(this._seed, 1664525) + 1013904223) >>> 0; return this._seed / 4294967296; }
  _unit(type, team, x, y, name) {
    return { id: this._id++, type, team, x, y, name, hp: 1, maxHp: 1, mp: 0, maxMp: 0, ad: 0, armor: 0, mr: 0,
      radius: .6, alive: true, facing: team === 'red' ? Math.PI * .75 : -Math.PI * .25, attackTimer: 0, attackFlash: 0,
      range: 0, speed: 0, attackSpeed: 1, shield: 0, shieldTimer: 0, stunTimer: 0, slowTimer: 0, slowAmount: 0,
      hasteTimer: 0, hasteAmount: 0, attackBuffTimer: 0, attackBuff: 0, reductionTimer: 0, reduction: 0,
      invulnerableTimer: 0, invisibleTimer: 0, lastHitTime: -100, targetId: null, moveTarget: null, moving: false,
      _path: [], _pathIndex: 0, _navAt: 0, _think: 0, _deadAt: -1, visible: true, visibleTo: { blue: true, red: true } };
  }
  getEntity(id) { return this.entities.find(e => e.id === id); }
  /** Read-only jungle camp status for HUD/minimap: seconds until (re)spawn, 0 while alive. */
  get camps() { return this._camps.map(c => ({ id: c.id, variant: c.variant, x: c.x, y: c.y, side: c.side, radius: c.radius, alive: c.members.length > 0, respawnIn: c.members.length ? 0 : Math.max(0, c.spawnAt - this.time) })); }
  _event(type, text, team, extra = {}) {
    this.events.push({ id: this._eventId++, time: this.time, type, text, team, ...extra });
    if (this.events.length > 200) this.events.splice(0, this.events.length - 200);
  }
  _effect(kind, e, details = {}) {
    const effect = { id: this._effectId++, kind, x: e.x, y: e.y, team: e.team || 'neutral', life: .45, maxLife: .45, radius: e.radius || 1, ...details };
    effect.maxLife = effect.life; this.effects.push(effect);
    if (this.effects.length > 400) this.effects.splice(0, this.effects.length - 400);
    return effect;
  }
  _buildGrid() {
    this._grid.clear();
    for (const e of this.entities) if (e.alive) {
      const key = `${Math.floor(e.x / 12)},${Math.floor(e.y / 12)}`;
      let cell = this._grid.get(key); if (!cell) this._grid.set(key, cell = []); cell.push(e);
    }
  }
  _near(x, y, radius) {
    const list = [], minX = Math.floor((x - radius) / 12), maxX = Math.floor((x + radius) / 12), minY = Math.floor((y - radius) / 12), maxY = Math.floor((y + radius) / 12);
    const rr = radius * radius;
    for (let yy = minY; yy <= maxY; yy++) for (let xx = minX; xx <= maxX; xx++) {
      const cell = this._grid.get(`${xx},${yy}`); if (!cell) continue;
      for (const e of cell) if (e.alive && (e.x - x) ** 2 + (e.y - y) ** 2 <= rr) list.push(e);
    }
    return list;
  }
  _recalculate(h, initial = false) {
    const def = HERO_BY_ID.get(h.heroId), b = def.stats, g = def.growth, level = h.level - 1;
    const oldHp = h.maxHp, oldMp = h.maxMp;
    const sum = { hp: 0, mana: 0, ad: 0, ap: 0, apPct: 0, armor: 0, mr: 0, attackSpeedPct: 0, moveSpeed: 0, cdr: 0, critChance: 0, critDamage: 0, armorPen: 0, magicPen: 0, lifesteal: 0 };
    for (const id of h.items) { const item = ITEM_BY_ID.get(id); if (item) for (const [k, v] of Object.entries(item.stats)) sum[k] = (sum[k] || 0) + v; }
    Object.assign(h, { maxHp: b.hp + g.hp * level + sum.hp, maxMp: b.mp + g.mana * level + sum.mana,
      ad: b.ad + g.ad * level + sum.ad, ap: sum.ap * (1 + sum.apPct), armor: b.armor + g.armor * level + sum.armor,
      mr: b.mr + g.mr * level + sum.mr, attackSpeed: Math.min(2.5, b.attackSpeed * (1 + g.attackSpeedPct * level + sum.attackSpeedPct)),
      speed: b.speed + sum.moveSpeed, range: b.range, cdr: Math.min(.4, sum.cdr + (h._frostUntil > this.time ? .2 : 0)),
      critChance: Math.min(1, sum.critChance), critDamage: 2 + sum.critDamage, armorPen: Math.min(.8, sum.armorPen), magicPen: Math.min(.8, sum.magicPen),
      lifesteal: sum.lifesteal, hpRegen: b.hpRegen + level * .6, manaRegen: b.manaRegen + level * .2 });
    if (initial) { h.hp = h.maxHp; h.mp = h.maxMp; }
    else if (h.alive) { h.hp = clamp(h.hp + Math.max(0, h.maxHp - oldHp), 0, h.maxHp); h.mp = clamp(h.mp + Math.max(0, h.maxMp - oldMp), 0, h.maxMp); }
    else { h.hp = 0; h.mp = clamp(h.mp, 0, h.maxMp); }
  }
  isStructureVulnerable(e) {
    if (e.type !== 'tower' && e.type !== 'core') return true;
    if (e.type === 'tower') return !this.entities.some(t => t.type === 'tower' && t.alive && t.team === e.team && t.lane === e.lane && t.tier < e.tier);
    return ['top', 'mid', 'bot'].some(lane => !this.entities.some(t => t.type === 'tower' && t.alive && t.team === e.team && t.lane === lane && t.tier === 3));
  }
  _setGoal(e, x, y, force = false) {
    x = clamp(x, -56.6, 56.6); y = clamp(y, -56.6, 56.6);
    if (!force && e.moveTarget && Math.hypot(e.moveTarget.x - x, e.moveTarget.y - y) < 1.3 && e._pathIndex < e._path.length) return;
    e.moveTarget = { x, y };
    if (!force && this.time < e._navAt && e._pathIndex < e._path.length) return;
    e._navAt = this.time + .45; e._path = findPath(e, e.moveTarget, e.radius); e._pathIndex = 0;
  }
  _stop(e) { e.moveTarget = null; e._path = []; e._pathIndex = 0; e.moving = false; }
  _move(e, dt) {
    if (!e.moveTarget || e.stunTimer > 0 || e.recallTimer > 0 || e._castingUntil > this.time) return;
    let goal = e._path[e._pathIndex];
    if (!goal) { this._stop(e); return; }
    const dx = goal.x - e.x, dy = goal.y - e.y, dist = Math.hypot(dx, dy);
    const speed = e.speed * (e.slowTimer > 0 && (e._spinUntil || 0) <= this.time ? 1 - e.slowAmount : 1) * (e.hasteTimer > 0 ? 1 + e.hasteAmount : 1);
    const step = speed * dt;
    if (dist <= step + .08) { e.x = goal.x; e.y = goal.y; e._pathIndex++; if (e._pathIndex >= e._path.length) this._stop(e); }
    else { e.x += dx / dist * step; e.y += dy / dist * step; e.facing = Math.atan2(dy, dx); e.moving = true; }
  }
  _directMove(e, x, y, dt) {
    const len = Math.hypot(x, y); if (!len) return;
    const speed = e.speed * (e.slowTimer > 0 && (e._spinUntil || 0) <= this.time ? 1 - e.slowAmount : 1) * (e.hasteTimer > 0 ? 1 + e.hasteAmount : 1);
    const dx = x / Math.max(1, len) * speed * dt, dy = y / Math.max(1, len) * speed * dt, r = Math.min(.72, e.radius);
    if (terrainFree(e.x + dx, e.y + dy, r)) { e.x += dx; e.y += dy; }
    else if (terrainFree(e.x + dx, e.y, r)) e.x += dx;
    else if (terrainFree(e.x, e.y + dy, r)) e.y += dy;
    e.facing = Math.atan2(y, x); e.moving = true;
  }
  _dash(e, x, y, maxRange, passWalls = false) {
    let dx = x - e.x, dy = y - e.y, length = Math.hypot(dx, dy);
    if (length < .01) { dx = Math.cos(e.facing); dy = Math.sin(e.facing); length = 1; }
    const travel = Math.min(length, maxRange), start = { x: e.x, y: e.y };
    const end = { ...start }, steps = Math.ceil(travel / .25);
    for (let i = 1; i <= steps; i++) {
      const p = { x: start.x + dx / length * travel * i / steps, y: start.y + dy / length * travel * i / steps };
      if (terrainFree(p.x, p.y, Math.min(e.radius, .7))) { end.x = p.x; end.y = p.y; } else if (!passWalls) break;
    }
    e.x = end.x; e.y = end.y; e.facing = Math.atan2(dy, dx); this._stop(e);
    this._effect('beam', start, { team: e.team, toX: end.x, toY: end.y, color: e.color, life: .3, radius: .7 });
    return { start, end };
  }

  command(command) {
    if (this.winner) return { ok: false, message: '本局已经结束' };
    if (!command || typeof command.type !== 'string') return { ok: false, message: '无效指令' };
    const h = this.player;
    if (command.type === 'purchase') return this._purchase(h, command.itemId);
    if (command.type === 'sell') return this._sell(h, command.slot);
    if (command.type === 'autoBuy') { h.autoBuy = !!command.enabled; return { ok: true }; }
    if (this.paused) return { ok: false, message: '对局已暂停' };
    if (!h.alive) return { ok: false, message: '等待复活' };
    if (h.stunTimer > 0) return { ok: false, message: '当前受到控制' };
    switch (command.type) {
      case 'move': {
        if (!Number.isFinite(command.x) || !Number.isFinite(command.y)) return { ok: false, message: '无效位置' };
        this._cancelRecall(h); h._attackOrder = false; h.targetId = null; this._setGoal(h, command.x, command.y, true);
        this._effect('ring', { x: command.x, y: command.y, team: h.team }, { radius: .7, life: .45, color: '#b4f3c5' });
        return { ok: true };
      }
      case 'attack': {
        const target = command.targetId != null ? this.getEntity(command.targetId) : this._selectTarget(h, h.range + 6);
        if (!this._validTarget(h, target)) return { ok: false, message: '附近没有可攻击目标' };
        this._cancelRecall(h); h.targetId = target.id; h._attackOrder = true; return { ok: true };
      }
      case 'cast': return this._cast(h, command.slot, command.x, command.y);
      case 'recall': {
        if (h.recallTimer > 0) return { ok: false, message: '正在回城' };
        this._stop(h); h._attackOrder = false; h.targetId = null; h.recallTimer = 5;
        this._effect('ring', h, { radius: 2.1, life: 5, color: '#81d7ff', followId: h.id });
        return { ok: true, message: '保持原地 5 秒以回城' };
      }
      case 'heal': return this._healAbility(h);
      case 'flash': return this._flash(h, command.x, command.y);
      default: return { ok: false, message: '未知指令' };
    }
  }
  _validTarget(source, target, includeHidden = false) {
    return !!target && target.alive && target.team !== source.team && target.invulnerableTimer <= 0 && target.invisibleTimer <= 0 &&
      (includeHidden || target.type === 'monster' || target.visibleTo[source.team] !== false) && this.isStructureVulnerable(target);
  }
  _selectTarget(h, radius) {
    let best = null, bestScore = Infinity;
    for (const e of this._near(h.x, h.y, radius)) {
      if (!this._validTarget(h, e)) continue;
      let priority = e.type === 'hero' ? 0 : e.type === 'minion' ? 5 : e.type === 'monster' ? 8 : 12;
      const score = distance(h, e) + priority + e.hp / e.maxHp * 2;
      if (score < bestScore) { best = e; bestScore = score; }
    }
    return best;
  }
  _cancelRecall(h) { if (h.recallTimer > 0) { h.recallTimer = 0; for (const fx of this.effects) if (fx.followId === h.id && fx.kind === 'ring') fx.life = Math.min(fx.life, .1); } }
  _healAbility(h) {
    if (h.healCooldown > 0) return { ok: false, message: `疗伤还有 ${Math.ceil(h.healCooldown)} 秒` };
    h.healCooldown = 60; h._restoreUntil = this.time + 5;
    this._effect('heal', h, { life: 1, radius: 1.8, color: '#72f2a3' }); return { ok: true };
  }
  _flash(h, x, y) {
    if (h.flashCooldown > 0) return { ok: false, message: `闪现还有 ${Math.ceil(h.flashCooldown)} 秒` };
    if (!Number.isFinite(x) || !Number.isFinite(y)) { x = h.x + Math.cos(h.facing) * 5; y = h.y + Math.sin(h.facing) * 5; }
    this._cancelRecall(h); h.flashCooldown = 110;
    this._effect('ring', h, { life: .4, radius: 2.2, color: '#fff2b8' }); this._dash(h, x, y, 5, true);
    this._effect('ring', h, { life: .4, radius: 2.2, color: '#fff2b8' }); return { ok: true };
  }
  _purchase(h, id) {
    const item = ITEM_BY_ID.get(id); if (!item) return { ok: false, message: '没有这件装备' };
    let replacement = -1, price = item.price;
    if (item.category === 'boots') {
      replacement = h.items.findIndex(other => ITEM_BY_ID.get(other)?.category === 'boots');
      if (replacement >= 0) {
        const previous = ITEM_BY_ID.get(h.items[replacement]);
        if (previous.id === id || item.tier === 1) return { ok: false, message: '已拥有鞋类装备' };
        price -= Math.floor(previous.price * .6);
      }
    }
    if (replacement < 0 && h.items.length >= 6) return { ok: false, message: '装备栏已满' };
    if (h.gold + 1e-7 < price) return { ok: false, message: `还差 ${Math.ceil(price - h.gold)} 金币` };
    h.gold -= price; if (replacement >= 0) h.items[replacement] = id; else h.items.push(id);
    this._recalculate(h);
    if (h.isPlayer) this._event('purchase', `已购买 ${item.name}`, h.team, { itemId: id });
    return { ok: true, message: `已购买 ${item.name}` };
  }
  _sell(h, slot) {
    if (!Number.isInteger(slot) || slot < 0 || slot >= h.items.length) return { ok: false, message: '请选择已装备的物品' };
    const item = ITEM_BY_ID.get(h.items[slot]), value = Math.floor(item.price * .6);
    h.items.splice(slot, 1); h.gold += value;
    if (HERO_BY_ID.get(h.heroId).build.includes(item.id)) h.autoBuy = false;
    this._recalculate(h); this._event('sell', `已出售 ${item.name}，获得 ${value} 金币`, h.team);
    return { ok: true, message: `出售获得 ${value} 金币` };
  }
  _autoPurchase(h) {
    if (!h.autoBuy) return;
    for (const id of HERO_BY_ID.get(h.heroId).build) {
      const item = ITEM_BY_ID.get(id), boot = h.items.find(i => ITEM_BY_ID.get(i)?.category === 'boots');
      if (item.category === 'boots') { if (boot && (ITEM_BY_ID.get(boot).tier === 2 || item.tier === 1)) continue; }
      else if (h.items.includes(id)) continue;
      this._purchase(h, id); break;
    }
  }

  _cast(h, slot, x, y) {
    if (![0, 1, 2].includes(slot)) return { ok: false, message: '无效技能' };
    const rank = h.skillLevels[slot], def = HERO_BY_ID.get(h.heroId).skills[slot];
    if (rank <= 0) return { ok: false, message: slot === 2 ? '大招在 4 级解锁' : '二技能在 2 级解锁' };
    if (h.cooldowns[slot] > 0) return { ok: false, message: `技能还有 ${Math.ceil(h.cooldowns[slot])} 秒` };
    if (h.stunTimer > 0 || h._castingUntil > this.time) return { ok: false, message: '当前无法施放' };
    const cost = def.manaCosts[rank - 1]; if (h.mp < cost) return { ok: false, message: '法力不足' };
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      const target = this._selectTarget(h, def.range + 2);
      x = target ? target.x : h.x + Math.cos(h.facing) * def.range;
      y = target ? target.y : h.y + Math.sin(h.facing) * def.range;
    }
    let dx = x - h.x, dy = y - h.y, length = Math.hypot(dx, dy);
    if (length < .01) { dx = Math.cos(h.facing); dy = Math.sin(h.facing); length = 1; }
    const aim = { x: h.x + dx / length * Math.min(length, def.range), y: h.y + dy / length * Math.min(length, def.range) };
    let chosen = null;
    if (def.castType === 'target') {
      let best = 1.75;
      for (const e of this._near(h.x, h.y, def.range + 1)) {
        if (e.type !== 'hero' || !this._validTarget(h, e) || distance(h, e) > def.range + e.radius) continue;
        const d = Math.hypot(e.x - x, e.y - y); if (d < best) { chosen = e; best = d; }
      }
      if (!chosen) return { ok: false, message: '瞄准范围内没有敌方英雄' };
    }
    h.mp -= cost; h.cooldowns[slot] = def.cooldowns[rank - 1] * (1 - h.cdr); this._cancelRecall(h);
    h.facing = Math.atan2(dy, dx); h._castingUntil = this.time + Math.min(.25, def.castTime);
    this._effect('cast', h, { life: .45, color: h.color, radius: Math.max(1.5, def.radius || 1.5), slot });
    const v = name => skillValue(def, name, rank);
    const damage = v('damage') + v('adRatio') * h.ad + v('apRatio') * h.ap + v('hpRatio') * h.maxHp;
    if (h.heroId === 'fighter') h._empoweredUntil = this.time + 4;
    if (h.heroId === 'tank') {
      if (slot === 0) {
        const intended = { x: h.x + dx / length * def.range, y: h.y + dy / length * def.range };
        const blocker = this._lineTargets(h, h, intended, def.width).filter(e => e.type === 'hero').sort((a, b) => distance(h, a) - distance(h, b))[0];
        const destination = blocker || intended;
        const line = this._dash(h, destination.x, destination.y, def.range);
        this._circleDamage(h, h, v('impactRadius'), damage, 'physical', { stun: v('knockup') });
        this._effect('ring', line.end, { team: h.team, color: h.color, radius: v('impactRadius'), life: .55 });
      } else if (slot === 1) {
        h.shield += v('shield') + v('hpRatio') * h.maxHp; h.shieldTimer = v('duration');
        this._circleDamage(h, h, def.radius, v('damage'), 'magic', { slow: v('slow'), slowDur: v('slowDur') });
        this._effect('ring', h, { radius: def.radius, color: '#e6bf73', life: .65 });
      } else {
        this._dash(h, aim.x, aim.y, def.range, true); h.invulnerableTimer = .25;
        this._circleDamage(h, h, def.radius, damage, 'physical', { stun: v('knockup') });
        this._addZone(h, h, def.radius, v('zoneDur'), .4, 0, 'physical', { slow: v('slow'), slowDur: .6 }, 'tank');
      }
    } else if (h.heroId === 'fighter') {
      if (slot === 0) {
        for (const e of this._near(h.x, h.y, def.range + 1)) if (this._validTarget(h, e) && e.type !== 'tower' && e.type !== 'core') {
          const a = Math.atan2(e.y - h.y, e.x - h.x), delta = Math.atan2(Math.sin(a - h.facing), Math.cos(a - h.facing));
          if (Math.abs(delta) <= def.angle / 2 && distance(h, e) <= def.range + e.radius) this._skillHit(h, e, damage, 'physical', { slow: v('slow'), slowDur: v('slowDur') });
        }
        this._effect('slash', h, { radius: def.range, facing: h.facing, color: '#ffb468', life: .4 });
      } else if (slot === 1) {
        const line = this._dash(h, h.x + dx / length * def.range, h.y + dy / length * def.range, def.range);
        this._lineDamage(h, line.start, line.end, def.width, damage, 'physical'); h.attackBuff = v('asBonus'); h.attackBuffTimer = v('asDur');
      } else {
        h._spinUntil = this.time + v('duration'); h.reductionTimer = v('duration'); h.reduction = v('reduction');
        this._addZone(h, h, def.radius, v('duration'), v('tick'), damage, 'physical', {}, 'spin', true);
      }
    } else if (h.heroId === 'mage') {
      if (slot === 0) {
        const end = { x: h.x + dx / length * def.range, y: h.y + dy / length * def.range };
        this._lineDamage(h, h, end, def.width, damage, 'magic'); this._effect('beam', h, { toX: end.x, toY: end.y, radius: def.width, color: '#c1d7ff', life: .4 });
      } else if (slot === 1) {
        this._effect('ring', aim, { team: h.team, radius: def.radius, color: '#b6b5ff', life: v('delay') + .4 });
        this._pending.push({ at: this.time + v('delay'), kind: 'circle', sourceId: h.id, x: aim.x, y: aim.y, radius: def.radius, damage, dtype: 'magic', status: { slow: v('slow'), slowDur: v('slowDur'), pull: v('pull') } });
      } else this._addZone(h, aim, def.radius, v('duration') + v('delay'), v('duration') / v('waves'), damage, 'magic', { slow: v('slow'), slowDur: v('slowDur') }, 'mage', false, v('delay'));
    } else if (h.heroId === 'marksman') {
      if (slot === 0) {
        const end = { x: h.x + dx / length * def.range, y: h.y + dy / length * def.range };
        const hits = this._lineTargets(h, h, end, def.width).sort((a, b) => distance(h, a) - distance(h, b));
        for (const e of hits) { this._skillHit(h, e, damage * (e.type === 'hero' ? 1 : v('minionRatio')), 'physical', { slow: v('slow'), slowDur: v('slowDur') }); if (e.type === 'hero') break; }
        this._effect('beam', h, { toX: end.x, toY: end.y, color: '#edecb2', radius: .65, life: .35 });
      } else if (slot === 1) {
        this._dash(h, h.x + dx / length * Math.min(length, def.range), h.y + dy / length * Math.min(length, def.range), def.range, true);
        h.hasteTimer = v('hasteDur'); h.hasteAmount = v('haste'); h._critUntil = this.time + v('critWindow');
      } else this._addZone(h, aim, def.radius, v('duration') + v('delay'), v('tick'), damage, 'physical', { slow: v('slow'), slowDur: v('slowDur') }, 'arrows', false, v('delay'));
    } else if (h.heroId === 'assassin') {
      if (slot === 0) {
        const line = this._dash(h, h.x + dx / length * def.range, h.y + dy / length * def.range, def.range);
        const hits = this._lineTargets(h, line.start, line.end, def.width);
        for (const e of hits) this._skillHit(h, e, damage, 'physical');
        if (hits.some(e => e.type === 'hero')) h.cooldowns[slot] *= 1 - v('refund');
      } else if (slot === 1) {
        const counts = new Map();
        for (const turn of [-v('spread'), 0, v('spread')]) {
          const a = h.facing + turn, end = { x: h.x + Math.cos(a) * def.range, y: h.y + Math.sin(a) * def.range };
          const e = this._lineTargets(h, h, end, def.width).sort((a, b) => distance(h, a) - distance(h, b))[0];
          if (e) { this._skillHit(h, e, damage * (counts.has(e.id) ? v('repeatRatio') : 1), 'physical', { slow: v('slow'), slowDur: v('slowDur') }); counts.set(e.id, true); }
          this._effect('beam', h, { toX: end.x, toY: end.y, radius: .35, color: '#ccacff', life: .3 });
        }
      } else {
        h.invulnerableTimer = v('vanish'); this._dash(h, chosen.x, chosen.y, def.range + 1, true);
        this._damage(h, chosen, damage + v('missingRatio') * (chosen.maxHp - chosen.hp), 'physical', 'skill');
        this._effect('slash', chosen, { team: h.team, radius: 2.5, life: .55, color: '#e8b7ff' });
      }
    }
    if (this._pending.length > 256) this._pending.splice(0, this._pending.length - 256);
    return { ok: true, message: def.name };
  }
  _lineTargets(h, start, end, width) {
    const middle = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
    return this._near(middle.x, middle.y, distance(start, end) / 2 + width + 2).filter(e => this._validTarget(h, e) && e.type !== 'tower' && e.type !== 'core' && segmentDistance(e, start, end) <= width / 2 + e.radius);
  }
  _lineDamage(h, start, end, width, amount, dtype) { for (const e of this._lineTargets(h, start, end, width)) this._skillHit(h, e, amount, dtype); }
  _circleDamage(h, center, radius, amount, dtype, status = {}) {
    for (const e of this._near(center.x, center.y, radius + 2)) {
      if (!this._validTarget(h, e) || e.type === 'tower' || e.type === 'core' || distance(e, center) > radius + e.radius) continue;
      this._skillHit(h, e, amount, dtype, status);
      if (status.pull && e.alive) {
        const d = distance(e, center); if (d > .1) { const step = Math.min(status.pull, d * .5); const x = e.x + (center.x - e.x) / d * step, y = e.y + (center.y - e.y) / d * step; if (terrainFree(x, y, .5)) { e.x = x; e.y = y; } }
      }
    }
  }
  _skillHit(h, e, amount, dtype, status = {}) {
    if (amount > 0) this._damage(h, e, amount, dtype, 'skill');
    if (!e.alive) return;
    if (status.stun) e.stunTimer = Math.max(e.stunTimer, status.stun);
    if (status.slow) { e.slowAmount = Math.max(e.slowTimer > 0 ? e.slowAmount : 0, status.slow); e.slowTimer = Math.max(e.slowTimer, status.slowDur || 1); }
    if (h.items?.includes('winter_scepter')) { e.slowAmount = Math.max(e.slowAmount, .2); e.slowTimer = Math.max(e.slowTimer, 1); }
    if (h.heroId === 'mage' && amount > 0) {
      e._marks ||= new Map(); let mark = e._marks.get(h.id); if (!mark || mark.until < this.time) mark = { count: 0, until: this.time + 5 };
      mark.count++; mark.until = this.time + 5;
      if (mark.count >= 3) { mark.count = 0; e.stunTimer = Math.max(e.stunTimer, .75); this._damage(h, e, e.type === 'hero' ? e.maxHp * .06 : Math.min(300, e.maxHp * .06), 'magic', 'passive'); }
      e._marks.set(h.id, mark);
    }
  }
  _addZone(h, center, radius, duration, interval, amount, dtype, status, style, follow = false, delay = 0) {
    this._zones.push({ sourceId: h.id, x: center.x, y: center.y, radius, until: this.time + duration, next: this.time + delay, interval, amount, dtype, status, style, follow, remaining: Math.max(1, Math.round((duration - delay) / interval)), team: h.team });
    this._effect('ring', center, { team: h.team, radius, life: duration, color: h.color, zone: style, followId: follow ? h.id : undefined });
    if (this._zones.length > 64) this._zones.shift();
  }
  _damage(source, target, amount, dtype = 'physical', reason = 'attack', reflected = false) {
    if (!target.alive || target.invulnerableTimer > 0 || target.invisibleTimer > 0 || !this.isStructureVulnerable(target) || !(amount > 0)) return 0;
    const structure = target.type === 'tower' || target.type === 'core';
    if (source) {
      if (source.heroId === 'assassin') { if (target.hp / target.maxHp < .4) amount *= 1.18; if (target.type === 'monster') amount *= 1.25; }
      if (!structure && source.items?.includes('starfall_blade') && target.hp / target.maxHp < .5) amount *= 1.15;
      if (this._blessing[source.team] > this.time && source.type === 'hero') amount *= 1.15;
    }
    if (structure) {
      const accompanied = this._near(target.x, target.y, 10).some(e => e.type === 'minion' && e.team !== target.team && e.team !== 'neutral');
      if (!accompanied) amount *= PACING.unaccompaniedMult;
      amount *= fortification(target, this.time);
      if (this.time > PACING.structureRampStart) amount *= 1 + (this.time - PACING.structureRampStart) / 60 * PACING.structureRampPerMin;
    }
    if (target.reductionTimer > 0) amount *= Math.max(.2, 1 - target.reduction);
    if (dtype !== 'true') {
      const resist = dtype === 'magic' ? target.mr : target.armor, pen = source ? (dtype === 'magic' ? source.magicPen || 0 : source.armorPen || 0) : 0;
      amount *= 600 / (600 + Math.max(0, resist * (1 - pen)));
    }
    const shield = Math.min(target.shield, amount); target.shield -= shield;
    const hpDamage = Math.min(target.hp, Math.max(0, amount - shield)); target.hp = Math.max(0, target.hp - (amount - shield));
    target.lastHitTime = this.time; target._lastAttackerId = source?.id;
    if (target.type === 'hero') {
      this._cancelRecall(target); target._lastCombat = this.time;
      if (source?.type === 'hero' || source?.type === 'tower' || source?.type === 'core') target._restoreUntil = 0;
      if (source?.type === 'hero') { target._damagers.set(source.id, this.time); source._lastCombat = this.time; source._hitHeroAt = this.time; }
    }
    if (target.type === 'monster' && source) { target.targetId = source.id; target._aggroAt = this.time; }
    if (source?.type === 'hero') source._lastCombat = this.time;
    this._effect('hit', target, { life: .18, color: dtype === 'magic' ? '#b9b7ff' : '#fff2d0', radius: .7 });
    if ((source?.isPlayer || target.isPlayer) && amount >= 1) this._effect('text', target, { life: .75, text: String(Math.round(amount)), color: target.isPlayer ? '#ff9c9c' : dtype === 'magic' ? '#c4b6ff' : '#ffe3a5', radius: .1 });
    if (reason === 'attack' && source && !reflected) {
      if (target.items?.includes('guardian_plate')) { source._crippledUntil = this.time + 2; }
      if (target.items?.includes('thorn_mail')) this._damage(target, source, amount * .18, 'magic', 'reflect', true);
      if (source.lifesteal > 0 && !structure) source.hp = Math.min(source.maxHp, source.hp + hpDamage * source.lifesteal);
    }
    if (target.type === 'hero' && target.alive && target.hp > 0 && target.hp / target.maxHp < .35 && target.items.includes('starweave_cloak') && this.time >= target._shieldProcAt) {
      target.shield += 600 + target.level * 60; target.shieldTimer = Math.max(target.shieldTimer, 4); target._shieldProcAt = this.time + 60;
    }
    if (target.hp <= 0) this._kill(target, source);
    return hpDamage;
  }
  _earnGold(h, amount) { const value = Math.round(amount); h.gold += value; h.goldEarned += value; }
  _gainXp(h, amount) {
    if (h.level >= 15 || amount <= 0) return;
    h.xp += amount;
    while (h.level < 15 && h.xp >= h.xpToNext) {
      h.xp -= h.xpToNext; h.level++; h.xpToNext = h.level >= 15 ? 0 : 160 + 60 * (h.level - 1);
      this._recalculate(h); if (h.alive) { h.hp += (h.maxHp - h.hp) * .2; h.mp += (h.maxMp - h.mp) * .2; } h.skillLevels = skillRanks(h.level);
      this._effect('ring', h, { radius: 2.4, life: .7, color: '#fff2a8' });
      if (h.isPlayer) this._event('level', `等级提升 · Lv.${h.level}${h.level === 4 ? ' · 大招解锁' : ''}`, h.team);
    }
    if (h.level >= 15) h.xp = 0;
  }
  _kill(target, source) {
    target.alive = false; target.hp = 0; target._deadAt = this.time; target.shield = 0; this._stop(target);
    this._effect('death', target, { life: 1, radius: target.radius * 3, color: target.team === 'blue' ? '#86bdff' : target.team === 'red' ? '#ff9d98' : '#dcd094' });
    if (target.type === 'hero') {
      target.deaths++; target.recallTimer = 0; target._restoreUntil = 0; target.targetId = null; target._attackOrder = false;
      target.respawnTimer = Math.min(PACING.respawnMax, PACING.respawnBase + target.level * PACING.respawnPerLevel + Math.max(0, this.time - PACING.respawnLateStart) / PACING.respawnLateDivisor);
      let killer = source?.type === 'hero' && source.team !== target.team ? source : null;
      if (!killer) { let recent = -Infinity; for (const [id, at] of target._damagers) if (this.time - at <= 10 && at > recent) { const h = this.getEntity(id); if (h && h.team !== target.team) { killer = h; recent = at; } } }
      const assists = [];
      for (const [id, at] of target._damagers) { const h = this.getEntity(id); if (h && h !== killer && h.team !== target.team && this.time - at <= 10) assists.push(h); }
      if (killer) {
        let bounty = clamp(220 + 60 * target._streak - 40 * target._deathStreak, 110, 520);
        const first = !this._firstBlood; if (first) { this._firstBlood = true; bounty += 100; }
        killer.kills++; killer._streak++; killer._deathStreak = 0; this.score[killer.team]++; this._earnGold(killer, bounty);
        killer._multiKill = this.time - killer._lastKill <= 10 ? killer._multiKill + 1 : 1; killer._lastKill = this.time;
        for (const h of assists) { h.assists++; h._deathStreak = 0; this._earnGold(h, bounty * .8 / assists.length); }
        const xpHeroes = [...new Set([killer, ...assists, ...this._near(target.x, target.y, 12).filter(h => h.type === 'hero' && h.team === killer.team)])];
        for (const h of xpHeroes) this._gainXp(h, (140 + 28 * target.level) * XP_SHARES[Math.min(5, xpHeroes.length) - 1]);
        for (const h of [killer, ...assists]) if (h.heroId === 'assassin') { h.cooldowns[0] = 0; h.cooldowns[1] = 0; if (h.alive) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * .08); }
        const prefix = first ? '首杀 · ' : killer._multiKill >= 2 ? `${['', '', '双杀', '三杀', '四杀', '五杀'][Math.min(5, killer._multiKill)]} · ` : '';
        this._event('kill', `${prefix}${killer.name} 击败 ${target.name}`, killer.team, { killerId: killer.id, victimId: target.id, bounty, firstBlood: first });
      } else this._event('kill', `${target.name} 阵亡`, OTHER[target.team], { victimId: target.id });
      target._streak = 0; target._deathStreak++; target._damagers.clear();
    } else if (target.type === 'minion') {
      const def = MINIONS[target.variant], killer = source?.type === 'hero' ? source : null;
      if (killer) { killer.cs++; this._earnGold(killer, def.gold); }
      const recipients = this._near(target.x, target.y, 12).filter(h => h.type === 'hero' && h.team !== target.team && h.team !== 'neutral');
      if (killer && !recipients.includes(killer)) recipients.push(killer);
      for (const h of recipients) { if (h !== killer) this._earnGold(h, def.gold * .35); this._gainXp(h, def.xp * XP_SHARES[Math.min(5, recipients.length) - 1]); }
    } else if (target.type === 'tower') {
      const team = OTHER[target.team], rewards = [120, 140, 160][target.tier - 1];
      for (const h of this.entities) if (h.type === 'hero' && h.team === team) this._earnGold(h, rewards + (h === source ? 100 : 0));
      this._event('tower', `${team === 'blue' ? '我方' : '敌方'}摧毁${target.name}`, team, { lane: target.lane, tier: target.tier });
      for (const e of this.entities) if (e.type === 'tower' || e.type === 'core') e.protected = !this.isStructureVulnerable(e);
    } else if (target.type === 'core') {
      this.winner = OTHER[target.team]; this._event('victory', this.winner === 'blue' ? '胜利 · 敌方水晶已摧毁' : '失败 · 我方水晶已摧毁', this.winner);
      for (const e of this.entities) this._stop(e);
    } else if (target.type === 'monster') {
      const camp = this._camps.find(c => c.id === target.campId);
      if (camp) { camp.members = camp.members.filter(id => id !== target.id); if (!camp.members.length) camp.spawnAt = this.time + camp.respawn; }
      if (source?.type === 'hero') {
        const def = MONSTERS[target.variant]; this._earnGold(source, def.gold); this._gainXp(source, def.xp);
        if (target.variant === 'frost_golem') { source._frostUntil = this.time + 70; this._recalculate(source); this._event('buff', `${source.name} 获得蓝色增益`, source.team); }
        if (target.variant === 'ember_golem') { source._burnUntil = this.time + 70; this._event('buff', `${source.name} 获得红色增益`, source.team); }
        if (target.variant === 'abyss_drake' || target.variant === 'star_colossus') {
          for (const h of this.entities) if (h.type === 'hero' && h.team === source.team) { this._earnGold(h, target.variant === 'abyss_drake' ? 90 : 120); if (target.variant === 'abyss_drake') this._gainXp(h, 160); }
          if (target.variant === 'star_colossus') this._blessing[source.team] = this.time + 80;
          this._event('monster', `${source.team === 'blue' ? '我方' : '敌方'}击败${target.name}`, source.team);
        }
      }
    }
  }

  _basicAttack(source, target) {
    if (source.attackTimer > 0 || source.stunTimer > 0 || source._castingUntil > this.time || !this._validTarget(source, target)) return false;
    if (distance(source, target) > source.range + target.radius + .12) return false;
    let attackSpeed = source.attackSpeed;
    if (source.attackBuffTimer > 0) attackSpeed *= 1 + source.attackBuff;
    if (source._crippledUntil > this.time) attackSpeed *= .8;
    if (source.heroId === 'marksman' && source._passiveUntil > this.time) attackSpeed *= 1 + source._passiveStacks * .06;
    source.attackTimer = 1 / Math.min(2.5, Math.max(.1, attackSpeed)); source.attackFlash = .24;
    source.facing = Math.atan2(target.y - source.y, target.x - source.x); source._revealedUntil = this.time + 1.5;
    if (source.type === 'hero') this._cancelRecall(source);
    let raw = source.ad, dtype = HERO_BY_ID.get(source.heroId)?.damageType || 'physical', critical = false;
    const structure = target.type === 'tower' || target.type === 'core';
    if (source.type === 'minion' && structure) raw *= MINIONS[source.variant].towerMult;
    if ((source.type === 'tower' || source.type === 'core') && target.type === 'minion') raw *= 1.4;
    if ((source.type === 'tower' || source.type === 'core') && target.type === 'hero') {
      if (source._focusTarget !== target.id || this.time - (source._lastShotAt || 0) > 3) source._focusHits = 0;
      raw *= 1 + Math.min(1, source._focusHits * .25); source._focusHits++; source._focusTarget = target.id; source._lastShotAt = this.time;
    }
    if (source.type === 'hero') {
      critical = source._critUntil > this.time || this.random() < source.critChance;
      if (critical) raw *= source.critDamage;
      source._critUntil = 0;
      if (source.heroId === 'fighter' && source._empoweredUntil > this.time) {
        raw += 80 + source.ad * .5; source._empoweredUntil = 0;
        source.hp = Math.min(source.maxHp, source.hp + source.maxHp * .05);
        this._effect('heal', source, { life: .4, color: '#86e89e' });
      }
      if (source.heroId === 'marksman' && source._passiveStacks >= 5 && source._passiveUntil > this.time && !structure) raw += 20 + source.level * 4;
    }
    const ranged = source.range > 3;
    if (ranged) {
      const speed = source.type === 'hero' ? HERO_BY_ID.get(source.heroId).projectileSpeed || 24 : source.type === 'tower' || source.type === 'core' ? 26 : 18;
      const travel = Math.max(.05, distance(source, target) / speed);
      this._pending.push({ kind: 'basic', at: this.time + travel, sourceId: source.id, targetId: target.id, amount: raw, dtype, critical });
      this._effect('projectile', source, { toX: target.x, toY: target.y, life: travel, color: source.team === 'blue' ? '#91d7ff' : source.team === 'red' ? '#ff9286' : '#e7d2a1', radius: source.type === 'core' ? .4 : .22 });
    } else {
      this._applyBasic(source, target, raw, dtype, critical);
      this._effect('slash', source, { toX: target.x, toY: target.y, facing: source.facing, life: .24, radius: Math.min(2.5, source.range), color: source.color || '#ead4b0' });
    }
    return true;
  }
  _applyBasic(source, target, raw, dtype, critical) {
    if (!target.alive || target.team === source.team) return;
    this._damage(source, target, raw, dtype, 'attack');
    if (!target.alive) return;
    const structure = target.type === 'tower' || target.type === 'core';
    if (source.heroId === 'tank') {
      source._passiveHits++;
      if (source._passiveHits % 3 === 0 && !structure) { this._damage(source, target, source.maxHp * .04, 'magic', 'passive'); target.slowAmount = .3; target.slowTimer = 1; this._effect('ring', target, { radius: 1.6, life: .35, color: '#e3bf75' }); }
    }
    if (source.heroId === 'marksman') {
      source._passiveStacks = source._passiveUntil > this.time ? Math.min(5, source._passiveStacks + 1) : 1;
      source._passiveUntil = this.time + 3;
      if (source._passiveStacks >= 5) { source.hasteAmount = Math.max(source.hasteAmount, .1); source.hasteTimer = Math.max(source.hasteTimer, 3); }
    }
    if (!structure && source.items?.includes('sunchaser_bow')) this._damage(source, target, 45, 'magic', 'passive');
    if (!structure && source._burnUntil > this.time) {
      target.slowAmount = Math.max(target.slowAmount, .15); target.slowTimer = Math.max(target.slowTimer, 1.5);
      target._burn = { sourceId: source.id, until: this.time + 3, next: this.time + 1, damage: 14 + source.level * 3 };
    }
  }
  _spawnWave() {
    this.wave++; this.nextWave += 30; this._event('wave', `第 ${this.wave} 波小兵出击`, 'neutral');
    const spawn = { top: { x: -52, y: 37 }, mid: { x: -41, y: 41 }, bot: { x: -37, y: 52 } };
    for (const team of TEAMS) for (const lane of ['top', 'mid', 'bot']) {
      const enemyHighGround = this.entities.some(e => e.type === 'tower' && e.team === OTHER[team] && e.lane === lane && e.tier === 3 && e.alive);
      const lineup = [enemyHighGround ? 'melee' : 'super', 'melee', 'ranged'];
      if (this.wave % 3 === 0) lineup.push('siege');
      const base = spawn[lane], position = team === 'blue' ? base : { x: base.y, y: base.x };
      lineup.forEach((variant, i) => this._pending.push({ kind: 'spawn', at: this.time + i * .6, team, lane, variant, x: position.x, y: position.y }));
    }
  }
  _spawnMinion(job) {
    if (this.entities.filter(e => e.type === 'minion' && e.alive).length >= 420) return;
    const def = MINIONS[job.variant], minutes = Math.floor(this.time / 60), overtime = 1 + Math.max(0, this.time - PACING.minionOvertimeStart) / 60 * PACING.minionOvertimePerMin;
    const boost = this._blessing[job.team] > this.time ? 1.4 : 1;
    const e = this._unit('minion', job.team, job.x, job.y, def.name);
    Object.assign(e, { lane: job.lane, variant: job.variant, hp: (def.hp + minutes * def.hpGrowth) * overtime * boost,
      maxHp: (def.hp + minutes * def.hpGrowth) * overtime * boost, ad: (def.ad + minutes * def.adGrowth) * overtime * boost,
      armor: def.armor, mr: def.armor, range: def.range, speed: def.speed, attackSpeed: def.attackSpeed, radius: def.radius,
      _think: this.random() * .15, _laneOffset: (this.random() - .5) * .8 });
    this.entities.push(e);
  }
  _spawnCamp(camp) {
    const def = MONSTERS[camp.variant], minutes = Math.floor(this.time / 60);
    for (let i = 0; i < camp.count; i++) {
      const e = this._unit('monster', 'neutral', camp.x + (camp.count > 1 ? (i ? 1 : -1) : 0), camp.y, def.name);
      Object.assign(e, { variant: camp.variant, campId: camp.id, hp: def.hp + minutes * def.hpGrowth, maxHp: def.hp + minutes * def.hpGrowth,
        ad: def.ad + minutes * def.adGrowth, armor: def.armor, mr: def.mr, attackSpeed: def.attackSpeed, range: def.range, speed: def.speed,
        radius: def.radius, _home: { x: camp.x, y: camp.y }, _aggroAt: -100, _specialAt: this.time + 4, _returning: false });
      camp.members.push(e.id); this.entities.push(e);
    }
    if (camp.variant === 'abyss_drake' || camp.variant === 'star_colossus') this._event('spawn', `${def.name} 已出现在河道`, 'neutral');
  }
  _processPending() {
    const remaining = [];
    for (const job of this._pending) {
      if (job.at > this.time + 1e-8) { remaining.push(job); continue; }
      if (job.kind === 'spawn') { this._spawnMinion(job); continue; }
      const source = this.getEntity(job.sourceId); if (!source) continue;
      if (job.kind === 'basic') { const target = this.getEntity(job.targetId); if (target?.alive) this._applyBasic(source, target, job.amount, job.dtype, job.critical); }
      if (job.kind === 'circle') this._circleDamage(source, job, job.radius, job.damage, job.dtype, job.status);
      if (job.kind === 'breath') {
        for (const e of this._near(job.x, job.y, 8.5)) if (e.type === 'hero' && e.team !== 'neutral' && e.alive) {
          const angle = Math.atan2(e.y - job.y, e.x - job.x), delta = Math.atan2(Math.sin(angle - job.facing), Math.cos(angle - job.facing));
          if (Math.abs(delta) <= Math.PI / 6 && distance(e, job) <= 7.5 + e.radius) this._damage(source, e, job.damage, 'magic', 'skill');
        }
      }
    }
    this._pending = remaining;
  }
  _advanceZones() {
    const live = [];
    for (const z of this._zones) {
      if (z.until < this.time - 1e-8) continue;
      const h = this.getEntity(z.sourceId); if (!h || (z.follow && !h.alive)) continue;
      if (z.follow) { z.x = h.x; z.y = h.y; }
      if (z.remaining > 0 && this.time + 1e-8 >= z.next) {
        z.remaining--; z.next += z.interval; this._circleDamage(h, z, z.radius, z.amount, z.dtype, z.status);
        this._effect(z.style === 'spin' ? 'slash' : 'cast', z, { team: z.team, color: h.color, radius: z.radius, life: .35, zone: z.style });
      }
      live.push(z);
    }
    this._zones = live;
  }
  _advanceEffects(dt) {
    const live = [];
    for (const e of this.effects) {
      e.life -= dt;
      if (e.followId) { const unit = this.getEntity(e.followId); if (unit) { e.x = unit.x; e.y = unit.y; } }
      if (e.life > 0) live.push(e);
    }
    this.effects = live;
  }
  _timers(e, dt) {
    for (const key of ['attackTimer', 'attackFlash', 'stunTimer', 'slowTimer', 'hasteTimer', 'attackBuffTimer', 'reductionTimer', 'invulnerableTimer', 'invisibleTimer']) e[key] = Math.max(0, (e[key] || 0) - dt);
    if (e.shieldTimer > 0) { e.shieldTimer -= dt; if (e.shieldTimer <= 0) e.shield = 0; }
    if (e._burn && e._burn.until >= this.time && e._burn.next <= this.time) {
      e._burn.next += 1; const source = this.getEntity(e._burn.sourceId); this._damage(source, e, e._burn.damage, 'true', 'burn');
    }
    if (e._burn?.until < this.time) e._burn = null;
    if (e._marks) for (const [id, mark] of e._marks) if (mark.until < this.time) e._marks.delete(id);
  }
  _tickHero(h, dt) {
    h.gold += 3.9 * dt; h.goldEarned += 3.9 * dt;
    h.cooldowns = h.cooldowns.map(c => Math.max(0, c - dt)); h.flashCooldown = Math.max(0, h.flashCooldown - dt); h.healCooldown = Math.max(0, h.healCooldown - dt);
    h._buyTimer -= dt; if (h._buyTimer <= 0) { h._buyTimer = 1; this._autoPurchase(h); this._recalculate(h); }
    if (!h.alive) {
      h.respawnTimer = Math.max(0, h.respawnTimer - dt);
      if (h.respawnTimer <= 0) {
        const fountain = MAP.fountains[h.team]; h.x = fountain.x; h.y = fountain.y; h.alive = true; h.hp = h.maxHp; h.mp = h.maxMp;
        h.invulnerableTimer = 1.5; h.stunTimer = 0; h.slowTimer = 0; h._retreating = false; h._burn = null; h._frostUntil = 0; h._burnUntil = 0;
        this._stop(h); h.targetId = null; h._attackOrder = false;
        this._effect('heal', h, { color: '#b1dfff', radius: 2.5, life: .8 });
        if (h.isPlayer) this._event('respawn', '你已复活，返回战场', h.team);
      }
      return;
    }
    h.hp = Math.min(h.maxHp, h.hp + (h.hpRegen + (this._blessing[h.team] > this.time ? h.maxHp * .01 : 0)) * dt);
    h.mp = Math.min(h.maxMp, h.mp + (h.manaRegen + (h._frostUntil > this.time ? h.maxMp * .015 : 0)) * dt);
    if (h.items.includes('undying_heart') && this.time - h._lastCombat >= 5) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * .02 * dt);
    if (h._restoreUntil > this.time) { h.hp = Math.min(h.maxHp, h.hp + h.maxHp * .06 * dt); h.mp = Math.min(h.maxMp, h.mp + h.maxMp * .06 * dt); }
    if (distance(h, MAP.fountains[h.team]) <= MAP.fountainRadius) {
      h.hp = Math.min(h.maxHp, h.hp + h.maxHp * .12 * dt); h.mp = Math.min(h.maxMp, h.mp + h.maxMp * .12 * dt);
    }
    const human = h.isPlayer && !this.options.demo;
    if (human && Math.hypot(this.input.x, this.input.y) > .05) {
      this._cancelRecall(h); this._stop(h); h._attackOrder = false; h.targetId = null;
      if (h.stunTimer <= 0) this._directMove(h, this.input.x, this.input.y, dt); return;
    }
    if (h.recallTimer > 0) {
      h.recallTimer = Math.max(0, h.recallTimer - dt);
      if (h.recallTimer <= 1e-8) {
        const base = MAP.fountains[h.team]; h.x = base.x; h.y = base.y; h.recallTimer = 0; this._stop(h);
        this._effect('heal', h, { life: .6, radius: 2.2, color: '#b6e8ff' });
        if (h.isPlayer) this._event('recall', '已回到泉水', h.team);
      }
      return;
    }
    if (h.stunTimer > 0) return;
    if (!human && !this.options.noBots) {
      h._think -= dt;
      if (h._think <= 0) {
        const difficulty = h.team === 'red' ? this.options.difficulty : this.options.difficulty === 'easy' ? 'easy' : 'normal';
        h._think = difficulty === 'hard' ? .16 : difficulty === 'easy' ? .4 : .24;
        this._thinkHero(h, difficulty);
      }
    }
    const target = this.getEntity(h.targetId);
    if (h._attackOrder && this._validTarget(h, target)) {
      if (distance(h, target) <= h.range + target.radius) { this._basicAttack(h, target); if (!h._kite) this._stop(h); }
      else if (human) this._setGoal(h, target.x, target.y);
    } else if (h._attackOrder) { h.targetId = null; h._attackOrder = false; }
    this._move(h, dt);
  }
  _enemyTowerDanger(h) {
    return this._near(h.x, h.y, 16).filter(e => (e.type === 'tower' || e.type === 'core') && e.team === OTHER[h.team] && e.alive).sort((a, b) => distance(h, a) - distance(h, b))[0] || null;
  }
  _thinkHero(h, difficulty) {
    const def = HERO_BY_ID.get(h.heroId), base = MAP.fountains[h.team], fraction = h.hp / h.maxHp;
    const nearby = this._near(h.x, h.y, 15), enemies = nearby.filter(e => e.type === 'hero' && e.team === OTHER[h.team] && this._validTarget(h, e));
    const allies = nearby.filter(e => e.type === 'hero' && e.team === h.team && e.alive);
    h._kite = false;
    if (fraction < .5 && h.healCooldown <= 0 && (!enemies.length || fraction < .32)) this._healAbility(h);
    const fleeAt = { tank: .22, fighter: .23, mage: .3, marksman: .3, assassin: .28 }[h.heroId];
    if (fraction < fleeAt || (enemies.length > allies.length + 1 && fraction < .65)) h._retreating = true;
    if (h._retreating) {
      h.targetId = null; h._attackOrder = false;
      if (distance(h, base) <= 4) {
        this._stop(h); if (fraction >= .92 && h.mp / h.maxMp >= .75) h._retreating = false;
      } else if (!enemies.some(e => distance(h, e) < 12) && this.time - h._lastCombat > 3 && distance(h, base) > 18) {
        this._stop(h); h.recallTimer = 5; this._effect('ring', h, { radius: 2, life: 5, color: '#89cfff', followId: h.id });
      } else {
        this._setGoal(h, base.x, base.y);
        if (enemies.some(e => distance(h, e) < 4) && h.flashCooldown <= 0 && difficulty !== 'easy') this._flash(h, base.x, base.y);
      }
      return;
    }
    const tower = this._enemyTowerDanger(h);
    const minionCover = tower && this._near(tower.x, tower.y, 10).some(e => e.type === 'minion' && e.team === h.team);
    const unsafeTower = tower && !minionCover && distance(h, tower) < tower.range + h.radius + 3;
    let target = enemies.filter(e => distance(h, e) < 11 && (!unsafeTower || distance(e, tower) > tower.range + 1)).sort((a, b) => (a.hp / a.maxHp + distance(a, h) * .045) - (b.hp / b.maxHp + distance(b, h) * .045))[0];
    if (target && !unsafeTower && (enemies.length <= allies.length + 1 || target.hp / target.maxHp < .28)) {
      h.targetId = target.id; h._attackOrder = true;
      const d = distance(h, target);
      if (difficulty !== 'easy' || this.random() < .55) this._aiSkills(h, target, true, difficulty);
      if (d > h.range + target.radius - .2) this._setGoal(h, target.x, target.y);
      else if (h.range > 5 && d < h.range * .58 && h.attackTimer > .15) {
        const dx = h.x - target.x, dy = h.y - target.y, len = Math.hypot(dx, dy) || 1;
        this._setGoal(h, h.x + dx / len * 3, h.y + dy / len * 3); h._kite = true;
      } else this._stop(h);
      return;
    }
    if (unsafeTower) {
      h.targetId = null; h._attackOrder = false;
      const p = laneProjection(h, h.lane === 'jungle' ? 'mid' : h.lane);
      const retreat = lanePoint(h.lane === 'jungle' ? 'mid' : h.lane, p.progress - sign(h.team) * 5);
      this._setGoal(h, retreat.x, retreat.y);
      return;
    }
    const soldiers = nearby.filter(e => e.type === 'minion' && e.team === OTHER[h.team] && this._validTarget(h, e));
    if (soldiers.length) {
      soldiers.sort((a, b) => ((a.hp < h.ad * 1.25 ? -8 : 0) + distance(h, a)) - ((b.hp < h.ad * 1.25 ? -8 : 0) + distance(h, b)));
      target = soldiers[0]; h.targetId = target.id; h._attackOrder = true;
      if (h.mp / h.maxMp > .4 && soldiers.length >= 2) this._aiSkills(h, target, false, difficulty);
      if (distance(h, target) > h.range + target.radius - .15) this._setGoal(h, target.x, target.y); else this._stop(h);
      return;
    }
    const targetTower = nearby.filter(e => (e.type === 'tower' || e.type === 'core') && e.team === OTHER[h.team] && this._validTarget(h, e) && distance(h, e) < 14).sort((a, b) => distance(h, a) - distance(h, b))[0];
    if (targetTower && this._near(targetTower.x, targetTower.y, 10).some(e => e.type === 'minion' && e.team === h.team)) {
      h.targetId = targetTower.id; h._attackOrder = true;
      if (distance(h, targetTower) > h.range + targetTower.radius - .3) this._setGoal(h, targetTower.x, targetTower.y); else this._stop(h);
      return;
    }
    if (h.lane === 'jungle' && this.time < PACING.groupPushAt) {
      if (this._jungleDecision(h, difficulty)) return;
    }
    h.targetId = null; h._attackOrder = false;
    let lane = h.lane === 'jungle' ? 'mid' : h.lane;
    if (this.time > PACING.groupPushAt) {
      const counts = ['top', 'mid', 'bot'].map(l => ({ lane: l, count: this.entities.filter(e => e.type === 'tower' && e.team === OTHER[h.team] && e.lane === l && e.alive).length }));
      const lowest = Math.min(...counts.map(c => c.count));
      lane = counts.find(c => c.lane === 'mid' && c.count === lowest)?.lane || counts.find(c => c.count === lowest).lane;
      h._pushLane = lane;
    }
    this._advanceLane(h, lane, 8);
  }
  _aiSkills(h, target, heroFight, difficulty) {
    if (h._nextCastAt > this.time || h.mp / h.maxMp < .18) return;
    const d = distance(h, target), def = HERO_BY_ID.get(h.heroId);
    const order = heroFight ? (h.heroId === 'mage' ? [1, 2, 0] : [2, 0, 1]) : [0, 1];
    for (const slot of order) {
      const skill = def.skills[slot]; if (h.skillLevels[slot] <= 0 || h.cooldowns[slot] > 0 || d > skill.range + .7) continue;
      if (skill.castType === 'self' && d > skill.radius + target.radius) continue;
      if (h.heroId === 'marksman' && slot === 1) {
        if (d > 4 || !heroFight) continue;
        const result = this._cast(h, slot, h.x + (h.x - target.x), h.y + (h.y - target.y));
        if (result.ok) { h._nextCastAt = this.time + .5; break; }
      } else {
        const error = difficulty === 'easy' ? 1.7 : difficulty === 'hard' ? .2 : .65;
        const aimed = skill.castType === 'target' ? { x: target.x, y: target.y } : { x: target.x + (this.random() - .5) * error, y: target.y + (this.random() - .5) * error };
        const result = this._cast(h, slot, aimed.x, aimed.y);
        if (result.ok) { h._nextCastAt = this.time + (difficulty === 'easy' ? .8 : .3); break; }
      }
    }
  }
  _jungleDecision(h, difficulty) {
    let monsters = this.entities.filter(e => e.type === 'monster' && e.alive && e.variant !== 'abyss_drake' && e.variant !== 'star_colossus');
    monsters = monsters.filter(e => {
      const c = this._camps.find(c => c.id === e.campId); return c?.side === h.team;
    }).sort((a, b) => distance(h, a) - distance(h, b));
    if (monsters.length) {
      const e = monsters[0]; h.targetId = e.id; h._attackOrder = true;
      if (distance(h, e) > h.range + e.radius) this._setGoal(h, e.x, e.y); else this._stop(h);
      if (h.mp / h.maxMp > .3) this._aiSkills(h, e, false, difficulty);
      return true;
    }
    const camp = this._camps.filter(c => c.side === h.team && c.spawnAt - this.time < 12).sort((a, b) => a.spawnAt - b.spawnAt)[0];
    if (camp && this.time < 30) { this._setGoal(h, camp.x, camp.y); return true; }
    return false;
  }
  _advanceLane(e, lane, amount = 6) {
    const projection = laneProjection(e, lane), direction = sign(e.team);
    const completed = direction > 0 ? projection.progress >= projection.total - 2 : projection.progress <= 2;
    const enemyCore = this.entities.find(u => u.type === 'core' && u.team === OTHER[e.team]);
    if (completed && enemyCore && this.isStructureVulnerable(enemyCore)) { this._setGoal(e, enemyCore.x, enemyCore.y); return; }
    let next;
    if (projection.distance > 7) next = projection.point;
    else next = lanePoint(lane, projection.progress + direction * amount);
    this._setGoal(e, next.x, next.y);
  }
  _tickMinion(e, dt) {
    e._think -= dt;
    if (e._think <= 0) {
      e._think = .25;
      let target = this.getEntity(e.targetId);
      if (!this._validTarget(e, target) || target.team === 'neutral' || distance(e, target) > 12) {
        const targets = this._near(e.x, e.y, 10.5).filter(t => t.team === OTHER[e.team] && this._validTarget(e, t));
        targets.sort((a, b) => {
          const score = u => distance(e, u) + (u.type === 'minion' ? 0 : u.type === 'hero' ? 2 : 3);
          return score(a) - score(b);
        }); target = targets[0] || null; e.targetId = target?.id || null;
      }
      if (target) {
        if (distance(e, target) > e.range + target.radius) this._setGoal(e, target.x, target.y); else this._stop(e);
      } else this._advanceLane(e, e.lane, 6);
    }
    const target = this.getEntity(e.targetId);
    if (target?.alive && distance(e, target) <= e.range + target.radius) { this._basicAttack(e, target); this._stop(e); }
    if (e.stunTimer <= 0) this._move(e, dt);
  }
  _tickStructure(e, dt) {
    e._think -= dt;
    if (e._think <= 0) {
      e._think = .12;
      const targets = this._near(e.x, e.y, e.range + 2).filter(t => t.team === OTHER[e.team] && this._validTarget(e, t) && distance(e, t) <= e.range + t.radius);
      const offender = targets.filter(t => t.type === 'hero' && this.time - (t._hitHeroAt || -100) < 2).sort((a, b) => distance(e, a) - distance(e, b))[0];
      const old = this.getEntity(e.targetId), hold = old && targets.includes(old);
      if (offender && !(hold && old.type === 'hero')) e.targetId = offender.id;
      else if (!hold) {
        targets.sort((a, b) => {
          const priority = t => t.type === 'minion' ? t.variant === 'siege' || t.variant === 'super' ? -10 : -5 : 0;
          return priority(a) - priority(b) || distance(e, a) - distance(e, b);
        }); e.targetId = targets[0]?.id || null;
      }
    }
    const target = this.getEntity(e.targetId); if (target) this._basicAttack(e, target);
    if (e.type === 'core' && this.time - e.lastHitTime > PACING.coreRegenDelay) e.hp = Math.min(e.maxHp, e.hp + PACING.coreRegenPerSec * dt);
  }
  _tickMonster(e, dt) {
    let target = this.getEntity(e.targetId);
    if (target && (!target.alive || distance(target, e._home) > 11 || distance(e, e._home) > 9)) { target = null; e.targetId = null; e._returning = true; }
    if (e._returning) {
      e.hp = Math.min(e.maxHp, e.hp + e.maxHp * .2 * dt); this._setGoal(e, e._home.x, e._home.y);
      if (distance(e, e._home) < .7 && e.hp >= e.maxHp) { this._stop(e); e._returning = false; }
      this._move(e, dt); return;
    }
    if (!target) {
      e._think -= dt;
      if (e._think <= 0) { e._think = .5; target = this._near(e.x, e.y, 2.5).find(t => t.type === 'hero' && t.alive && this._validTarget(e, t)); if (target) e.targetId = target.id; }
    }
    if (!target || !target.alive) { e.hp = Math.min(e.maxHp, e.hp + e.maxHp * .025 * dt); return; }
    if (distance(e, target) > e.range + target.radius) this._setGoal(e, target.x, target.y); else { this._stop(e); this._basicAttack(e, target); }
    if (e.variant === 'abyss_drake' && this.time >= e._specialAt && distance(e, target) < 8) {
      e._specialAt = this.time + 12; const facing = Math.atan2(target.y - e.y, target.x - e.x);
      this._effect('cast', e, { life: .9, radius: 7.5, facing, color: '#ff9e5b', cone: true });
      for (let i = 0; i < 4; i++) this._pending.push({ kind: 'breath', at: this.time + .9 + i * .2, sourceId: e.id, x: e.x, y: e.y, facing, damage: e.ad * 3 / 4 });
    }
    if (e.stunTimer <= 0) this._move(e, dt);
  }
  _updateVisibility() {
    const live = this.entities.filter(e => e.alive);
    for (const e of this.entities) {
      e.inBush = MAP.bushes.findIndex(p => contains(e, p));
      for (const team of TEAMS) {
        if (e.team === team || e.type === 'monster' || e.type === 'tower' || e.type === 'core') { e.visibleTo[team] = true; continue; }
        e.visibleTo[team] = live.some(a => {
          if (a.team !== team) return false;
          const sight = a.type === 'hero' || a.type === 'core' ? 13 : a.type === 'tower' ? 11 : 9;
          const d = distance(a, e); if (d > sight) return false;
          return e.inBush < 0 || e._revealedUntil > this.time || d <= 2.2 || contains(a, MAP.bushes[e.inBush]);
        });
      }
      e.visible = e.visibleTo.blue;
    }
  }
  step(delta) {
    if (!Number.isFinite(delta) || delta <= 0 || this.paused) return;
    const dt = Math.min(delta, .05); this._advanceEffects(dt);
    if (this.winner) return;
    this.time += dt; this.nextWaveIn = Math.max(0, this.nextWave - this.time);
    this._buildGrid();
    if (!this.options.noSpawns) {
      if (this.time + 1e-8 >= this.nextWave) this._spawnWave();
      for (const camp of this._camps) if (!camp.members.length && this.time + 1e-8 >= camp.spawnAt) this._spawnCamp(camp);
    }
    this._processPending(); this._advanceZones();
    const length = this.entities.length;
    for (let i = 0; i < length; i++) {
      const e = this.entities[i]; e.moving = false;
      if (e.alive) this._timers(e, dt);
      if (e.type === 'hero') this._tickHero(e, dt);
      else if (e.alive) {
        if (e.type === 'minion') this._tickMinion(e, dt);
        else if (e.type === 'tower' || e.type === 'core') this._tickStructure(e, dt);
        else if (e.type === 'monster') this._tickMonster(e, dt);
      }
      if (this.winner) break;
    }
    this._fountainAt = (this._fountainAt || 0) - dt;
    if (this._fountainAt <= 0) {
      this._fountainAt = .5;
      for (const team of TEAMS) {
        const base = MAP.fountains[team], core = this.entities.find(e => e.type === 'core' && e.team === team);
        for (const e of this._near(base.x, base.y, MAP.fountainRadius)) if (e.team === OTHER[team]) this._damage(core, e, e.maxHp * .2, 'true', 'fountain');
      }
    }
    this.entities = this.entities.filter(e => e.type === 'hero' || e.type === 'tower' || e.type === 'core' || e.alive || this.time - e._deadAt < .6);
    this._timeSinceGrid += dt;
    if (this._timeSinceGrid >= .2) { this._timeSinceGrid = 0; this._updateVisibility(); }
    if (this._pending.length > 512) this._pending.splice(0, this._pending.length - 512);
  }
}

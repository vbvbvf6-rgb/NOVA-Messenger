#!/usr/bin/env python3
"""
Download Twemoji PNGs for all gift catalog items and save them to
artifacts/pulse/public/gifts/emoji/<codepoints>.png at 200x200.
Also prints the GIFT_LOCAL_PNG mapping to paste into twemoji.ts.
"""

import urllib.request
import urllib.error
import subprocess
import os
import sys
import time

OUTPUT_DIR = "artifacts/pulse/public/gifts/emoji"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def emoji_to_twemoji_id(emoji: str) -> str:
    cps = [f"{ord(c):x}" for c in emoji]
    has_zwj = "200d" in cps
    if not has_zwj:
        cps = [cp for cp in cps if cp != "fe0f"]
    return "-".join(cps)

GIFTS = [
    # ── COMMON ─────────────────────────────────────────────────────────────────
    ("Яблоко",            "🍎"),
    ("Персик",            "🍑"),
    ("Вишня",             "🍒"),
    ("Виноград",          "🍇"),
    ("Капкейк",           "🧁"),
    ("Шоколад",           "🍫"),
    ("Печенье",           "🍪"),
    ("Арбуз",             "🍉"),
    ("Тюльпан",           "🌷"),
    ("Гибискус",          "🌺"),
    ("Пингвин",           "🐧"),
    ("Щенок",             "🐶"),
    ("Кролик",            "🐰"),
    ("Хомячок",           "🐹"),
    ("Пальма",            "🌴"),
    ("Снежинка",          "❄️"),
    ("Осьминог",          "🐙"),
    ("Краб",              "🦀"),
    ("Черепаха",          "🐢"),
    ("Лягушка",           "🐸"),
    ("Сердечко",          "❤️"),
    ("Звёздочка",         "⭐"),
    ("Мыльный пузырь",    "🫧"),
    ("Конфета",           "🍬"),
    ("Клубника",          "🍓"),
    ("Леденец",           "🍭"),
    ("Ромашка",           "🌼"),
    ("Цветок сакуры",     "🌸"),
    ("Пончик",            "🍩"),
    ("Мороженое",         "🍦"),
    ("Рыбка",             "🐟"),
    ("Подсолнух",         "🌻"),
    ("Чашка кофе",        "☕"),
    ("Луна",              "🌙"),
    ("Четырёхлистник",    "🍀"),
    ("Бабочка",           "🦋"),
    ("Котёнок",           "🐱"),
    ("Воздушный шар",     "🎈"),
    ("Ретро-телефон",     "📞"),
    ("Пицца",             "🍕"),
    ("Медвежонок",        "🧸"),
    ("Торт",              "🎂"),
    ("Игровая приставка", "🎮"),
    ("Снеговик",          "⛄"),
    ("Радужный кит",      "🐳"),
    # ── RARE ───────────────────────────────────────────────────────────────────
    ("Палитра",           "🎨"),
    ("Пазл",              "🧩"),
    ("Мишень",            "🎯"),
    ("Барабаны",          "🥁"),
    ("Пианино",           "🎹"),
    ("Бант",              "🎀"),
    ("Волна",             "🌊"),
    ("Гора",              "🏔️"),
    ("Свеча",             "🕯️"),
    ("Маска",             "🎭"),
    ("Жемчуг",            "🪬"),
    ("Маяк",              "🗼"),
    ("Корона",            "👑"),
    ("Красная роза",      "🌹"),
    ("Бриллиант",         "💎"),
    ("Золотая монета",    "🪙"),
    ("Ракета",            "🚀"),
    ("Гитара",            "🎸"),
    ("Кубок",             "🏆"),
    ("Радуга",            "🌈"),
    ("Молния",            "⚡"),
    ("Дельфин",           "🐬"),
    ("Лиса",              "🦊"),
    ("Сова",              "🦉"),
    ("Акула",             "🦈"),
    ("Парусник",          "⛵"),
    ("Самоцвет",          "🏅"),
    ("Медаль",            "🥇"),
    ("Попугай",           "🦜"),
    ("Волшебная лампа",   "🪔"),
    ("Горящее сердце",    "❤️\u200d🔥"),
    # ── EPIC ───────────────────────────────────────────────────────────────────
    ("Лев",               "🦁"),
    ("Тигр",              "🐯"),
    ("Орёл",              "🦅"),
    ("Вулкан",            "🌋"),
    ("ДНК жизни",         "🧬"),
    ("Фейерверк",         "🎆"),
    ("Алхимия",           "⚗️"),
    ("Горилла",           "🦍"),
    ("Медуза",            "🪼"),
    ("Пантера",           "🐆"),
    ("Молот Тора",        "🔨"),
    ("Паутина",           "🕸️"),
    ("Дракон",            "🐉"),
    ("Единорог",          "🦄"),
    ("Планета",           "🪐"),
    ("Волшебство",        "🪄"),
    ("Кристалл",          "🔮"),
    ("Пегас",             "🐎"),
    ("Нарвал",            "🐋"),
    ("Хрустальное сердце","💠"),
    ("Жар-птица",         "🔥"),
    ("Грифон",            "🦁"),
    ("Сапфировый кулон",  "💎"),
    ("Магический гриб",   "🍄"),
    ("Золотая рыбка",     "🐟"),
    ("Рубиновое кольцо",  "💍"),
    ("Волшебная скрипка", "🎻"),
    ("Чёрный кот",        "🐈\u200d⬛"),
    ("Сфинкс",            "🏺"),
    ("Огненный дракон",   "🐲"),
    # ── LEGENDARY ──────────────────────────────────────────────────────────────
    ("Метеор",            "🌠"),
    ("Планета Земля",     "🌍"),
    ("Вечный лёд",        "🧊"),
    ("Магнит Судьбы",     "🧲"),
    ("Атомный вихрь",     "☢️"),
    ("Алмазный скипетр",  "🪄"),
    ("Сапфировый щит",    "🛡️"),
    ("Галактика",         "🌌"),
    ("Ангел",             "👼"),
    ("Пульс",             "💜"),
    ("Легендарная звезда","🌟"),
]

ok = []
failed = []

print(f"Processing {len(GIFTS)} gifts...\n")

for name, emoji in GIFTS:
    twemoji_id = emoji_to_twemoji_id(emoji)
    url = f"https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/{twemoji_id}.png"
    out_file = os.path.join(OUTPUT_DIR, f"{twemoji_id}.png")

    if os.path.exists(out_file) and os.path.getsize(out_file) > 500:
        ok.append((name, twemoji_id))
        print(f"  SKIP  {name:30s}  {twemoji_id}")
        continue

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            raw = resp.read()
        if len(raw) < 100:
            raise ValueError("Too small")

        tmp = f"/tmp/_gift_{twemoji_id}.png"
        with open(tmp, "wb") as f:
            f.write(raw)

        result = subprocess.run([
            "magick", tmp,
            "-resize", "170x170",
            "-background", "none",
            "-gravity", "center",
            "-extent", "200x200",
            out_file,
        ], capture_output=True, timeout=15)

        if result.returncode == 0 and os.path.exists(out_file):
            ok.append((name, twemoji_id))
            print(f"  OK    {name:30s}  {twemoji_id}")
        else:
            failed.append((name, emoji, twemoji_id, url))
            print(f"  MAGICK FAIL  {name}  rc={result.returncode}  {result.stderr.decode()[:80]}")

    except Exception as e:
        failed.append((name, emoji, twemoji_id, url))
        print(f"  FAIL  {name:30s}  {e}")

print(f"\n✅ {len(ok)} OK   ❌ {len(failed)} failed")

if failed:
    print("\nFailed gifts:")
    for n, em, tid, u in failed:
        print(f"  {n} ({em}) → {u}")

print("\n\n# ── Paste into GIFT_LOCAL_PNG in twemoji.ts ──────────────────────────")
for name, twemoji_id in ok:
    key = name.ljust(25)
    print(f'  "{key}": "/gifts/emoji/{twemoji_id}.png",')

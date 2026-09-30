"""EXIF Make/Model → 品牌名归一。

相机侧 Make 一定有（实测 SONY / FUJIFILM / Xiaomi），镜头侧相反：副厂手动头在 Sony 机身上
LensMake 是空的（Sigma、Viltrox 都是），只有富士机身的适马/老蛙头会给 LensMake。
所以品牌一律先查 Make 别名表，查不到再按型号串的特征规则猜；猜不出来返回空串，
交给后台人工填，不硬编一个错的品牌糊弄过去。
"""
import re

# Make 原样是厂商注册名，常见带公司全称、逗号、尾随 \x00 或空格
MAKE_ALIASES = {
    "sony": "Sony",
    "canon": "Canon",
    "nikon corporation": "Nikon",
    "nikon": "Nikon",
    "fujifilm": "Fujifilm",
    "fuji photo film": "Fujifilm",
    "olympus optical co.,ltd": "Olympus",
    "olympus": "Olympus",
    "panasonic": "Panasonic",
    "panasonic mining co.,ltd.": "Panasonic",
    "leica camera ag": "Leica",
    "leica": "Leica",
    "ricoh": "Ricoh",
    "pentax": "Pentax",
    "hasselblad": "Hasselblad",
    "apple": "Apple",
    "google": "Google",
    "samsung": "Samsung",
    "xiaomi": "Xiaomi",
    "redmi": "Xiaomi",
    "huawei": "Huawei",
    "honor": "Honor",
    "dji": "DJI",
    "gopro": "GoPro",
    "sigma": "Sigma",
    "tamron": "Tamron",
    "viltrox": "Viltrox",
    "ttartisan": "TTArtisan",
    "ttartisans": "TTArtisan",
    "7artisan": "7Artisans",
    "7artists": "7Artisans",
    "sirui": "Sirui",
    "laowa": "Laowa",
    "venus optics": "Laowa",
    "carl zeiss": "Zeiss",
    "zeiss": "Zeiss",
    "cosina": "Cosina",
    "voigtländer": "Voigtländer",
    "voigtlander": "Voigtländer",
    "sg-image": "SG-image",
    "sg": "SG-image",
    "shenzhen": "SG-image",
    "oneplus": "OnePlus",
    "oppo": "OPPO",
    "vivo": "vivo",
    "realme": "realme",
}

# 型号特征规则：按顺序取第一个命中。只有 Make 缺失/为垃圾值时才走这里
CAMERA_MODEL_RULES = [
    # Sony 微单代号是 ILCE/ILCA/ILME 这种「IL+字母+字母-」的形式，别写成 ^ILC-
    (r"^IL[CIM][A-Z]-|^SLT-|^DSLR-A|^ALPHA|^ILME", "Sony"),
    (r"^NEX-|^RX100|^RX10|^ZV\d|^A\d{3}\b", "Sony"),
    (r"^X-[A-Z]|^X-T\d|^X-S\d|^X-H\d|^GFX|^FINEPIX|^HS\d", "Fujifilm"),
    (r"^EOS|^PowerShot|^IXUS|^ELPH", "Canon"),
    (r"^NIKON|^D\d{2,3}\b|^Z \d|^COOLPIX|^ZENITH", "Nikon"),
    (r"^OM-|^PEN|^E-M\d|^E-P\d|^STYLUS", "Olympus"),
    (r"^DC-|^DMC-|^LUMIX|^S\d\b", "Panasonic"),
    (r"^SL\d|^CL\d|^M\d{2}\b|^Q\d\d", "Leica"),
    (r"^iPhone", "Apple"),
    (r"^Pixel|^GR\d|^PX\d", "Google"),
    (r"^SM-|^GT-|^GT[0-9]", "Samsung"),
    # 小米的型号代号：M2007J1SC、23127PN0CC、21091116C 这类
    (r"^M\d{4}[A-Z0-9]+$|^[2-5]\d{3}[A-Z0-9]{4,}$|^Redmi|^Mi \d|^POCO", "Xiaomi"),
    (r"^ANA-|^ELS-|^NOH-|^MKA-|^ADT-|^BMH-|^LGE-|^MAG-|^OCE-|^RE-|^JL-", "Huawei"),
    (r"^Osmo|^Pocket-|^DJI", "DJI"),
]

LENS_MODEL_RULES = [
    # 适马 DG DN / Art / Contemporary / Sports 后缀常带三位编号
    (r"DG DN|DG HSM|DG OS|\| ?(Art|Contemporary|Sports)|^SIGMA", "Sigma"),
    (r"Di III|Di VC|^Model [AB]\d|TAMRON|^B\d{3}\d?", "Tamron"),
    (r"^VILTROX|Viltrox", "Viltrox"),
    (r"TTARTISAN|TTArtisan", "TTArtisan"),
    (r"7ARTISANS|7Artisans", "7Artisans"),
    (r"^SG[- ]|SG-image", "SG-image"),
    (r"SIRUI|^OPTek|PEI-\d", "Sirui"),
    (r"LAOWA|Venus Optics|^LAWA", "Laowa"),
    (r"BATIS|LOXIA|MILVUS|OTUS|ZEISS|T\* ", "Zeiss"),
    (r"VOIGTLANDER|Voigtlander|ULTRON-\d|^COLOR-", "Voigtländer"),
    (r"^FE |^SEL|^E PZ |^E \d|^E18-|G OSS|G II\b", "Sony"),
    (r"^XF |^XC |^GF |^MKX|FUJINON", "Fujifilm"),
    (r"^RF \d|^EF \d|^EF-S|CANON", "Canon"),
    (r"NIKKOR|^Z \d|^AF-P", "Nikon"),
    (r"^MILC|^LUMIX|^S-R\d|^X \d{2}mm F\d", "Panasonic"),
]

# 明确不算数据的占位值：相机/镜头都见过 '----'（索尼无镜头信息时写这个）
JUNK = {"", "----", "n/a", "na", "null", "none", "unknown", "s-e", "standard"}


def clean(text) -> str:
    """去掉 NUL 填充、首尾空白和引号；'----' 这类占位值一律当空。"""
    if text is None:
        return ""
    s = str(text).replace("\x00", "").replace("\x01", "").strip().strip('"').strip()
    # 有些固件把整段描述写成 'SG 25/1.8 XF                    '
    s = re.sub(r"\s{2,}", " ", s).strip()
    return "" if s.lower() in JUNK else s


def _alias(make: str) -> str:
    key = clean(make).lower().replace("\u00a0", " ").strip()
    if not key:
        return ""
    if key in MAKE_ALIASES:
        return MAKE_ALIASES[key]
    # 'FUJIFILM CORPORATION'、'OLYMPUS OPTICAL CO.,LTD' 之类截到第一个词再查
    head = re.split(r"[ ,]", key)[0]
    return MAKE_ALIASES.get(head, "")


def _brand_from_token(model: str) -> str:
    """型号串开头就是厂商名的情况（'Xiaomi 15'、'Viltrox 27mm F1.2 E'、'SG 25/1.8 XF'）。
    规则表要一条条写前缀，这类直接查别名表更稳。"""
    head = re.split(r"[\s\-]", model)[0].lower() if model else ""
    return MAKE_ALIASES.get(head, "")


def _match_rules(model: str, rules) -> str:
    up = model.upper()
    for pat, brand in rules:
        if re.search(pat, up, flags=re.IGNORECASE):
            return brand
    return ""


def camera_brand(make, model) -> str:
    """相机品牌：先认 Make，再看型号开头的厂商名，最后按型号特征猜。"""
    model = clean(model)
    return _alias(clean(make)) or _brand_from_token(model) or _match_rules(model, CAMERA_MODEL_RULES)


def lens_brand(make, model) -> str:
    """镜头品牌：副厂头在 Sony 机身上没有 LensMake（实测适马、唯卓仕都不写），只能靠型号串。"""
    model = clean(model)
    return _alias(clean(make)) or _brand_from_token(model) or _match_rules(model, LENS_MODEL_RULES)


def describe_lens_spec(spec) -> tuple[str, str]:
    """0xA432 LensSpecification = (最短焦距, 最长焦距, 最大光圈, 最大光圈)。
    变焦头给的是范围，定焦两头相同 —— 这是镜头固有属性，存进 gear 表而不是 photos。"""
    try:
        vals = [float(v) for v in spec if float(v) > 0]
    except (TypeError, ValueError):
        return "", ""
    if len(vals) < 3:
        return "", ""
    lo, hi, max_ap = vals[0], vals[1], min(vals[2:])
    focal = f"{int(lo)}mm" if lo == hi else f"{int(lo)}-{int(hi)}mm"
    aperture = f"F{max_ap:g}"
    return focal, aperture

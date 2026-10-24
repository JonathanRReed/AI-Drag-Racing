# Model identifier display

Model IDs remain exact provider identifiers in selection, requests, local history, JSON exports and shared receipts. Display formatting does not normalize or replace them.

HTML labels isolate direction with `bdi`. IDs containing formatting controls, default-ignorable characters, lone surrogates or literal backslashes include a visible **escaped representation**. This technical representation doubles literal backslashes and writes non-ASCII/control characters as `\u{HEX}`. It describes the original ID; do not substitute it into an API request.

Safe primary labels retain Unicode shaping, including Persian/Indic joiners, emoji sequences and variation selectors. Bidi controls, malformed UTF-16, C0/C1 controls and line separators use the escaped representation as the authoritative label. Search matches raw or displayed text literally, without interpreting typed escape syntax.

Canvas charts isolate ordinary Unicode names and use ASCII escaped names for exceptional identifiers. Exceptional or shortened labels have stable lane numbers and a visible full HTML mapping. Sorting moves labels and metrics together. Older, unusually long local IDs are shown in explicit pages of at most 512 Unicode code points, with UTF-16 offsets and previous/next buttons; the full stored value is unchanged.

This exposes covered formatting characters and isolates surrounding text. It does not guarantee visual uniqueness for all Unicode, fonts, combining sequences or lookalike letters.

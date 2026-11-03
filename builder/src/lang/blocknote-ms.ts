/**
 * Malay for BlockNote's own menus and hints, laid over its English
 * dictionary (editor/blocknote-dictionary.ts), so a key left out here
 * shows in English. Words follow the builder: "blok", "seksyen", "gambar".
 */

const slash = (title: string, subtext: string, group: string, aliases: string[] = []) => ({
    title,
    subtext,
    group,
    aliases,
});

const BASIC = 'Blok asas';
const HEADINGS = 'Tajuk';
const SUBHEADINGS = 'Subtajuk';
const MEDIA = 'Media';

const perMedia = (image: string, video: string, audio: string, file: string) => ({
    image,
    video,
    audio,
    file,
});

export const BLOCKNOTE_MS = {
    slash_menu: {
        heading: slash('Tajuk 1', 'Tajuk paling atas', HEADINGS, ['tajuk']),
        heading_2: slash('Tajuk 2', 'Tajuk utama seksyen', HEADINGS, ['tajuk']),
        heading_3: slash('Tajuk 3', 'Tajuk kecil dan kumpulan', HEADINGS, ['tajuk', 'kecil']),
        heading_4: slash('Tajuk 4', 'Tajuk kecil', SUBHEADINGS, ['tajuk']),
        heading_5: slash('Tajuk 5', 'Tajuk lebih kecil', SUBHEADINGS, ['tajuk']),
        heading_6: slash('Tajuk 6', 'Tajuk paling kecil', SUBHEADINGS, ['tajuk']),
        toggle_heading: slash('Tajuk lipat 1', 'Tajuk paling atas yang boleh dilipat', SUBHEADINGS, ['lipat']),
        toggle_heading_2: slash('Tajuk lipat 2', 'Tajuk seksyen yang boleh dilipat', SUBHEADINGS, ['lipat']),
        toggle_heading_3: slash('Tajuk lipat 3', 'Tajuk kecil yang boleh dilipat', SUBHEADINGS, ['lipat']),
        quote: slash('Petikan', 'Petikan atau kata-kata', BASIC, ['petikan']),
        toggle_list: slash('Senarai lipat', 'Senarai dengan item yang boleh disembunyikan', BASIC, ['lipat', 'soalan']),
        numbered_list: slash('Senarai bernombor', 'Senarai mengikut nombor', BASIC, ['senarai', 'nombor']),
        bullet_list: slash('Senarai titik', 'Senarai tanpa nombor', BASIC, ['senarai', 'titik']),
        check_list: slash('Senarai semak', 'Senarai dengan kotak tanda', BASIC, ['senarai', 'semak', 'tanda']),
        paragraph: slash('Perenggan', 'Teks biasa', BASIC, ['perenggan', 'teks']),
        code_block: slash('Blok kod', 'Kod dengan warna sintaks', BASIC, ['kod']),
        page_break: slash('Pemisah halaman', 'Pemisah antara halaman', BASIC, ['pemisah']),
        table: slash('Jadual', 'Jadual dengan sel yang boleh diubah', 'Lanjutan', ['jadual']),
        image: slash('Gambar', 'Gambar dengan kapsyen', MEDIA, ['gambar', 'foto']),
        video: slash('Video', 'Video dengan kapsyen', MEDIA, ['video']),
        audio: slash('Audio', 'Audio dengan kapsyen', MEDIA, ['audio', 'bunyi']),
        file: slash('Fail', 'Fail yang dimuat naik', MEDIA, ['fail']),
        emoji: slash('Emoji', 'Cari dan masukkan emoji', 'Lain-lain', ['emoji']),
        divider: slash('Garisan', 'Garisan pemisah antara blok', BASIC, ['garisan', 'pemisah']),
    },
    placeholders: {
        default: "Taip teks atau '/' untuk arahan",
        heading: 'Tajuk',
        toggleListItem: 'Lipat',
        bulletListItem: 'Senarai',
        numberedListItem: 'Senarai',
        checkListItem: 'Senarai',
    },
    file_blocks: {
        add_button_text: perMedia('Tambah gambar', 'Tambah video', 'Tambah audio', 'Tambah fail'),
    },
    toggle_blocks: {
        add_block_button: 'Lipatan kosong. Klik untuk tambah blok.',
    },
    side_menu: {
        add_block_label: 'Tambah blok',
        drag_handle_label: 'Buka menu blok',
    },
    drag_handle: {
        delete_menuitem: 'Padam',
        colors_menuitem: 'Warna',
        header_row_menuitem: 'Baris tajuk',
        header_column_menuitem: 'Lajur tajuk',
    },
    table_handle: {
        delete_column_menuitem: 'Padam lajur',
        delete_row_menuitem: 'Padam baris',
        add_left_menuitem: 'Tambah lajur di kiri',
        add_right_menuitem: 'Tambah lajur di kanan',
        add_above_menuitem: 'Tambah baris di atas',
        add_below_menuitem: 'Tambah baris di bawah',
        split_cell_menuitem: 'Pisahkan sel',
        merge_cells_menuitem: 'Gabungkan sel',
        background_color_menuitem: 'Warna latar',
    },
    suggestion_menu: {
        no_items_title: 'Tiada yang sepadan',
    },
    color_picker: {
        text_title: 'Teks',
        background_title: 'Latar',
        colors: {
            default: 'Asal',
            gray: 'Kelabu',
            brown: 'Coklat',
            red: 'Merah',
            orange: 'Oren',
            yellow: 'Kuning',
            green: 'Hijau',
            blue: 'Biru',
            purple: 'Ungu',
            pink: 'Merah jambu',
        },
    },
    formatting_toolbar: {
        bold: { tooltip: 'Tebal' },
        italic: { tooltip: 'Condong' },
        underline: { tooltip: 'Garis bawah' },
        strike: { tooltip: 'Garis lorek' },
        code: { tooltip: 'Kod' },
        colors: { tooltip: 'Warna' },
        link: { tooltip: 'Buat pautan' },
        file_caption: { tooltip: 'Ubah kapsyen', input_placeholder: 'Ubah kapsyen' },
        file_replace: {
            tooltip: perMedia('Tukar gambar', 'Tukar video', 'Tukar audio', 'Tukar fail'),
        },
        file_rename: {
            tooltip: perMedia('Tukar nama gambar', 'Tukar nama video', 'Tukar nama audio', 'Tukar nama fail'),
            input_placeholder: perMedia('Tukar nama gambar', 'Tukar nama video', 'Tukar nama audio', 'Tukar nama fail'),
        },
        file_download: {
            tooltip: perMedia('Muat turun gambar', 'Muat turun video', 'Muat turun audio', 'Muat turun fail'),
        },
        file_delete: {
            tooltip: perMedia('Padam gambar', 'Padam video', 'Padam audio', 'Padam fail'),
        },
        file_preview_toggle: { tooltip: 'Tunjuk atau sorok pratonton' },
        nest: { tooltip: 'Masukkan ke dalam' },
        unnest: { tooltip: 'Keluarkan' },
        align_left: { tooltip: 'Jajar kiri' },
        align_center: { tooltip: 'Jajar tengah' },
        align_right: { tooltip: 'Jajar kanan' },
        align_justify: { tooltip: 'Jajar penuh' },
        table_cell_merge: { tooltip: 'Gabungkan sel' },
        comment: { tooltip: 'Tambah komen' },
    },
    file_panel: {
        upload: {
            title: 'Muat naik',
            file_placeholder: perMedia('Muat naik gambar', 'Muat naik video', 'Muat naik audio', 'Muat naik fail'),
            upload_error: 'Ralat: muat naik gagal',
        },
        embed: {
            title: 'Pautan',
            embed_button: perMedia('Guna pautan gambar', 'Guna pautan video', 'Guna pautan audio', 'Guna pautan fail'),
            url_placeholder: 'Masukkan pautan',
        },
    },
    link_toolbar: {
        delete: { tooltip: 'Buang pautan' },
        edit: { text: 'Ubah pautan', tooltip: 'Ubah' },
        open: { tooltip: 'Buka di tab baru' },
        form: { title_placeholder: 'Ubah tajuk', url_placeholder: 'Ubah pautan' },
    },
    generic: {
        ctrl_shortcut: 'Ctrl',
    },
    multi_column: {
        slash_menu: {
            two_columns: slash('Dua lajur', 'Dua lajur bersebelahan', BASIC, ['lajur']),
            three_columns: slash('Tiga lajur', 'Tiga lajur bersebelahan', BASIC, ['lajur']),
        },
    },
};

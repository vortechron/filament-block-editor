<?php

// What the Filament page builder answers when it refuses a call.
return [
    'errors' => [
        'missing_block_reuse' => 'A block definition is missing. Re-enable it before adding or reusing this section.',
        'rich_json' => 'Rich words are not valid JSON. Reload the field and try again.',
        'rich_version' => 'Rich words need a version 1 inline value. Rebuild older translation drafts.',
        'rich_invalid' => 'Rich words contain invalid inline data. Reload the field and try again.',
        'rich_large' => 'Rich words are too large. Shorten this field before saving.',
        'rich_link' => 'A translated link is unsafe or invalid. Use a page path, https, email or telephone link.',
        'rich_chip' => 'A translated shop-info chip must use a shared permitted key.',
        'rich_legacy' => 'Older text-run translations must be rebuilt before saving.',
        'rich_table' => 'Table cells changed without stable identities. Restore the table and edit its identified fields, or rebuild its translations.',
        'rich_table_edit' => 'Table changes cannot be tracked safely here. Restore this edit and use the identified cell fields, or rebuild the table translations.',

        'kit_not_available' => 'Saving the design is not available here.',
        'section_not_available' => 'Saving sections is not available here.',
        'site_info_not_available' => 'Saving the shop info is not available here.',
        'title_needed' => 'A title is needed.',
        'section_only' => 'Only a section of its own can be saved.',
        'section_not_saved' => 'The section was not saved.',
        'ref_needed' => 'A synced section needs a ref: a positive number or an id of letters, digits, dashes and underscores.',
    ],
];

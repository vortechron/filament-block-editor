<?php

/**
 * Writes the rules the builder checks (Support\BuilderRules) to
 * builder/src/generated: rules.json and its TypeScript type. Run it after
 * changing a limit or a list on the PHP side, then run the tests:
 *
 *     php84 bin/export-rules.php
 */

use Vortechron\FilamentBlockEditor\Support\BuilderRules;

require __DIR__.'/../vendor/autoload.php';

$directory = __DIR__.'/../builder/src/generated';

if (! is_dir($directory) && ! mkdir($directory, 0755, true)) {
    fwrite(STDERR, "Could not make {$directory}.\n");
    exit(1);
}

file_put_contents($directory.'/rules.json', BuilderRules::json());
file_put_contents($directory.'/rules.d.json.ts', BuilderRules::typeDeclaration());

echo "Wrote builder/src/generated/rules.json and rules.d.json.ts.\n";

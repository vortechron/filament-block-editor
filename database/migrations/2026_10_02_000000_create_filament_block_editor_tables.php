<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('block_editor_media', function (Blueprint $table): void {
            $table->id();
            $table->nullableMorphs('tenant');
            $table->string('name');
            $table->string('disk')->default('public');
            $table->string('path');
            $table->string('mime_type');
            $table->unsignedBigInteger('size')->default(0);
            $table->timestamps();

            $table->index(['disk', 'path']);
            $table->index(['tenant_type', 'tenant_id', 'size']);
        });

        Schema::create('block_editor_styles', function (Blueprint $table): void {
            $table->id();
            $table->uuid()->unique();
            $table->nullableMorphs('tenant');
            $table->string('name');
            $table->boolean('is_default')->default(false);
            $this->appearanceColumns($table);
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();
        });

        Schema::create('block_editor_saved_blocks', function (Blueprint $table): void {
            $table->id();
            $table->uuid()->unique();
            $table->nullableMorphs('tenant');
            $table->string('name');
            $table->string('description')->nullable();
            $table->json('content')->nullable();
            $table->foreignId('block_style_id')->nullable()->constrained('block_editor_styles')->nullOnDelete();
            $table->json('style_overrides')->nullable();
            $this->appearanceColumns($table);
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();
        });

        Schema::create('block_editor_blocks', function (Blueprint $table): void {
            $table->id();
            $table->morphs('blockable');
            $table->nullableMorphs('tenant');
            $table->string('collection')->default('default');
            $table->string('kind')->default('content');
            $table->unsignedInteger('sort_order')->default(0);
            $table->json('content')->nullable();
            $table->foreignId('block_style_id')->nullable()->constrained('block_editor_styles')->nullOnDelete();
            $table->json('style_overrides')->nullable();
            $this->appearanceColumns($table);
            $table->timestamps();

            $table->index(['blockable_type', 'blockable_id', 'collection', 'sort_order'], 'block_editor_blocks_page_order_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('block_editor_blocks');
        Schema::dropIfExists('block_editor_saved_blocks');
        Schema::dropIfExists('block_editor_styles');
        Schema::dropIfExists('block_editor_media');
    }

    /**
     * The 15 appearance columns a block, a saved block and a style all carry
     * (HasBlockAppearance::APPEARANCE_COLUMNS). Every one is nullable: a block
     * that follows a style empties the columns it no longer owns.
     */
    private function appearanceColumns(Blueprint $table): void
    {
        $table->string('background_type', 20)->nullable();
        $table->string('background_color', 7)->nullable();
        $table->string('background_image_path')->nullable();
        $table->string('background_video_url', 2048)->nullable();
        $table->string('background_tint_color', 7)->nullable()->default('#0f172a');
        $table->string('background_tint_style', 20)->nullable()->default('normal');
        $table->unsignedTinyInteger('background_overlay')->nullable()->default(45);
        $table->string('background_position', 20)->nullable()->default('center');
        $table->unsignedTinyInteger('background_blur')->nullable()->default(0);
        $table->boolean('background_card')->nullable()->default(false);
        $table->string('padding_size', 20)->nullable()->default('md');
        $table->string('content_width', 20)->nullable()->default('normal');
        $table->boolean('full_height')->nullable()->default(false);
        $table->string('spacing_top', 20)->nullable()->default('md');
        $table->string('spacing_bottom', 20)->nullable()->default('md');
    }
};

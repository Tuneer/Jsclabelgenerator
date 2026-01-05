import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ColumnMapping, MappingTemplate } from '../../models/pos-item.model';
import { ColumnMappingService } from '../../services/column-mapping.service';

@Component({
  standalone: true,
  selector: 'app-column-mapper',
  templateUrl: './column-mapper.component.html',
  styleUrls: ['./column-mapper.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatSelectModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule
  ]
})
export class ColumnMapperComponent implements OnInit {
  @Input() excelColumns: string[] = [];
  @Input() sampleData: any[] = [];
  @Input() sheetName: string = '';
  @Input() currentSheetNumber: number = 1;
  @Input() totalSheets: number = 1;
  @Output() mappingComplete = new EventEmitter<ColumnMapping[]>();
  @Output() cancelled = new EventEmitter<void>();

  mappings: ColumnMapping[] = [];
  standardFields: string[] = [];
  savedTemplates: MappingTemplate[] = [];
  selectedTemplateId: string = '';
  templateName: string = '';
  showSaveTemplate = false;
  newCustomFields: Map<string, string> = new Map();

  constructor(private mappingService: ColumnMappingService) {}

  ngOnInit(): void {
    this.standardFields = this.mappingService.getStandardFields();
    this.savedTemplates = this.mappingService.getSavedTemplates();
    
    // Auto-detect mappings
    this.mappings = this.mappingService.autoDetectMapping(this.excelColumns);
    
    console.log('🗺️ Auto-detected mappings:', this.mappings);
  }

  onFieldChange(index: number, newField: string): void {
    const isCustom = !this.standardFields.includes(newField);
    this.mappings[index] = {
      ...this.mappings[index],
      appField: newField,
      isCustomField: isCustom
    };
  }

  addCustomField(excelColumn: string): void {
    const customFieldName = this.newCustomFields.get(excelColumn);
    if (!customFieldName || !customFieldName.trim()) return;

    const index = this.mappings.findIndex(m => m.excelColumn === excelColumn);
    if (index >= 0) {
      this.mappings[index] = {
        excelColumn,
        appField: customFieldName.trim(),
        isCustomField: true
      };
    }

    this.newCustomFields.delete(excelColumn);
  }

  getSampleValue(excelColumn: string): string {
    if (this.sampleData.length === 0) return '';
    const value = this.sampleData[0][excelColumn];
    if (value === null || value === undefined) return '';
    return String(value).substring(0, 50);
  }

  loadTemplate(): void {
    const template = this.savedTemplates.find(t => t.id === this.selectedTemplateId);
    if (!template) return;

    // Apply saved mappings
    this.mappings = this.excelColumns.map(excelCol => {
      const saved = template.mappings.find(m => m.excelColumn === excelCol);
      if (saved) {
        return { ...saved };
      }
      // Auto-detect for unmapped columns
      const autoDetected = this.mappingService.autoDetectMapping([excelCol])[0];
      return autoDetected || {
        excelColumn: excelCol,
        appField: excelCol.toLowerCase(),
        isCustomField: true
      };
    });

    console.log('📋 Loaded template:', template.name);
  }

  saveCurrentTemplate(): void {
    if (!this.templateName.trim()) {
      alert('Please enter a template name');
      return;
    }

    const template: MappingTemplate = {
      id: Date.now().toString(),
      name: this.templateName.trim(),
      mappings: [...this.mappings],
      createdAt: new Date().toISOString()
    };

    this.mappingService.saveTemplate(template);
    this.savedTemplates = this.mappingService.getSavedTemplates();
    this.showSaveTemplate = false;
    this.templateName = '';
    
    console.log('💾 Template saved:', template.name);
  }

  deleteTemplate(id: string): void {
    if (!confirm('Delete this mapping template?')) return;
    
    this.mappingService.deleteTemplate(id);
    this.savedTemplates = this.mappingService.getSavedTemplates();
    if (this.selectedTemplateId === id) {
      this.selectedTemplateId = '';
    }
  }

  confirmMapping(): void {
    // Validate: ensure we have mappings
    if (this.mappings.length === 0) {
      alert('No column mappings found. Please try uploading the file again.');
      return;
    }

    // Check if at least one column is mapped to 'id' or similar identifier field
    const hasIdField = this.mappings.some(m => 
      m.appField === 'id' || 
      m.appField.toLowerCase().includes('id') ||
      m.appField.toLowerCase() === 'code' ||
      m.appField.toLowerCase() === 'sku'
    );
    
    if (!hasIdField) {
      const confirmProceed = confirm(
        'No ID field detected. Continue anyway? Items will be assigned auto-generated IDs.'
      );
      if (!confirmProceed) {
        return;
      }
    }

    console.log('✅ Mapping confirmed:', this.mappings);
    console.log('📤 Emitting mappingComplete event...');
    
    // Emit the event
    this.mappingComplete.emit(this.mappings);
  }

  cancel(): void {
    this.cancelled.emit();
  }

  getAvailableFields(currentMapping: ColumnMapping): string[] {
    const usedStandard = this.mappings
      .filter(m => !m.isCustomField && m.excelColumn !== currentMapping.excelColumn)
      .map(m => m.appField);
    
    return this.standardFields.filter(f => !usedStandard.includes(f));
  }
}

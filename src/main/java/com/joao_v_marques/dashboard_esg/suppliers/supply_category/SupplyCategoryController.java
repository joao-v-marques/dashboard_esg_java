package com.joao_v_marques.dashboard_esg.suppliers.supply_category;

import com.joao_v_marques.dashboard_esg.suppliers.supply_category.dto.SupplyCategoryRequest;
import com.joao_v_marques.dashboard_esg.suppliers.supply_category.dto.SupplyCategoryResponse;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/supply-categories")
public class SupplyCategoryController {

    private final SupplyCategoryService supplyCategoryService;

    public SupplyCategoryController(SupplyCategoryService supplyCategoryService) {
        this.supplyCategoryService = supplyCategoryService;
    }

    // GET de todas as categorias de fornecimento cadastradas no sistema
    @GetMapping
    public List<SupplyCategoryResponse> findAll() {
        return supplyCategoryService.findAll();
    }

    // POST de uma nova categoria de fornecimento no sistema
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<SupplyCategoryResponse> create(@Valid @RequestBody SupplyCategoryRequest request) {
        SupplyCategoryResponse created = supplyCategoryService.create(request);

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.id())
                .toUri();

        return ResponseEntity.created(location).body(created);
    }

    // PUT de uma categoria de fornecimento já existente
    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<SupplyCategoryResponse> update(@PathVariable Integer id, @Valid @RequestBody SupplyCategoryRequest request) {
        SupplyCategoryResponse updated = supplyCategoryService.update(id, request);

        return ResponseEntity.ok(updated);
    }

    // PATCH para desativar uma categoria de fornecimento já existente
    @PatchMapping(value = "/{id}/deactivate")
    public ResponseEntity<SupplyCategoryResponse> deactivate(@PathVariable Integer id) {
        SupplyCategoryResponse deactivated = supplyCategoryService.deactivate(id);

        return ResponseEntity.ok(deactivated);
    }

    // PATCH para reativar uma categoria de fornecimento já existente
    @PatchMapping(value = "/{id}/reactivate")
    public ResponseEntity<SupplyCategoryResponse> reactivate(@PathVariable Integer id) {
        SupplyCategoryResponse reactivated = supplyCategoryService.reactivate(id);

        return ResponseEntity.ok(reactivated);
    }
}

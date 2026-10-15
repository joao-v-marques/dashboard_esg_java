package com.joao_v_marques.dashboard_esg.users.role;

import com.joao_v_marques.dashboard_esg.users.role.dto.RoleRequest;
import com.joao_v_marques.dashboard_esg.users.role.dto.RoleResponse;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/roles")
public class RoleController {

    private final RoleService roleService;

    public RoleController(RoleService roleService) {
        this.roleService = roleService;
    }

    // GET de todas as roles cadastradas no sistema
    @GetMapping
    public List<RoleResponse> findAll() {
        return roleService.findAll();
    }

    // POST de uma nova role no sistema
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<RoleResponse> create(@Valid @RequestBody RoleRequest request) {
        RoleResponse created = roleService.create(request);

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.id())
                .toUri();

        return ResponseEntity.created(location).body(created);
    }

    // PUT de uma role já existente
    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<RoleResponse> update(@PathVariable Integer id, @Valid @RequestBody RoleRequest request) {
        RoleResponse updated = roleService.update(id, request);

        return ResponseEntity.ok(updated);
    }

    // PATCH para desativar uma role já existente
    @PatchMapping(value = "/{id}/deactivate")
    public ResponseEntity<RoleResponse> deactivate(@PathVariable Integer id) {
        RoleResponse deactivated = roleService.deactivate(id);

        return ResponseEntity.ok(deactivated);
    }

    // PATCH para reativar uma role já existente
    @PatchMapping(value = "/{id}/reactivate")
    public ResponseEntity<RoleResponse> reactivate(@PathVariable Integer id) {
        RoleResponse reactivated = roleService.reactivate(id);

        return ResponseEntity.ok(reactivated);
    }
}

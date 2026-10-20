package com.joao_v_marques.dashboard_esg.nips.nips_nature;

import com.joao_v_marques.dashboard_esg.nips.nips_nature.dto.NipNatureRequest;
import com.joao_v_marques.dashboard_esg.nips.nips_nature.dto.NipNatureResponse;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/nip-natures")
public class NipNatureController {

    private final NipNatureService nipNatureService;

    public NipNatureController(NipNatureService nipNatureService) {
        this.nipNatureService = nipNatureService;
    }

    @GetMapping
    public List<NipNatureResponse> findAll() {
        return nipNatureService.findAll();
    }

    // POST de uma nova natureza de NIP no sistema
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<NipNatureResponse> create(@Valid @RequestBody NipNatureRequest request) {
        NipNatureResponse created = nipNatureService.create(request);

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.id())
                .toUri();

        return ResponseEntity.created(location).body(created);
    }

    // PUT de uma natureza de NIP já existente
    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<NipNatureResponse> update(@PathVariable Integer id, @Valid @RequestBody NipNatureRequest request) {
        NipNatureResponse updated = nipNatureService.update(id, request);

        return ResponseEntity.ok(updated);
    }
}

package com.joao_v_marques.dashboard_esg.nip;

import com.joao_v_marques.dashboard_esg.nip.dto.NipNatureRequest;
import com.joao_v_marques.dashboard_esg.nip.dto.NipNatureResponse;
import com.joao_v_marques.dashboard_esg.shared.exceptions.ConflictException;
import com.joao_v_marques.dashboard_esg.shared.exceptions.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NipNatureService {

    private final NipNatureRepository nipNatureRepository;

    public NipNatureService(NipNatureRepository nipNatureRepository) {
        this.nipNatureRepository = nipNatureRepository;
    }

    @Transactional(readOnly = true)
    public List<NipNatureResponse> findAll() {
        return nipNatureRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public NipNatureResponse create(NipNatureRequest request) {
        String name = request.name().trim();
        String description = request.description() == null ? null : request.description().trim();

        if (nipNatureRepository.existsByNameIgnoreCase(name)) {
            throw new ConflictException("A natureza de NIP que está tentando cadastrar já existe");
        }

        // Montar entidade com base na dto
        NipNature nipNature = new NipNature();
        nipNature.setName(name);
        nipNature.setDescription(description);

        NipNature saved = nipNatureRepository.save(nipNature);

        return toResponse(saved);
    }

    @Transactional
    public NipNatureResponse update(Integer nipNatureId, NipNatureRequest request) {
        String name = request.name().trim();
        String description = request.description() == null ? null : request.description().trim();

        // Valida se a natureza editada realmente existe
        NipNature nipNature = nipNatureRepository.findById(nipNatureId)
                .orElseThrow(() -> new ResourceNotFoundException("Não foi encontrada nenhuma natureza de NIP com o ID fornecido."));

        if (nipNatureRepository.existsByNameIgnoreCaseAndIdNot(name, nipNatureId)) {
            throw new ConflictException("Já existe outra natureza de NIP cadastrada com este nome");
        }

        // Atualizar a entidade já existente
        nipNature.setName(name);
        nipNature.setDescription(description);

        return toResponse(nipNature);
    }

    private NipNatureResponse toResponse(NipNature nipNature) {
        return new NipNatureResponse(
                nipNature.getId(),
                nipNature.getName(),
                nipNature.getDescription()
        );
    }
}
